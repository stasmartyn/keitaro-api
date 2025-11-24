import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KeitaroService } from "../keitaro/keitaro.service";
import { Logger } from "../utils/logger";
import { ReportPayload } from "../keitaro/interfaces/failover.interface";
import { PreviewResponseDto } from "./dto/app-banned.dto";

@Injectable()
export class FailoverService {
    constructor(
        private readonly keitaroService: KeitaroService,
        private readonly configService: ConfigService,
    ) {}

    async handleAppBan(
        platform: string,
        appId: string,
    ): Promise<PreviewResponseDto> {
        Logger.info(
            `Starting failover process for banned app: ${platform}/${appId}`,
            "FailoverService",
        );

        return await this.executeFailover(platform, appId, true);
    }

    async previewAppBan(
        platform: string,
        appId: string,
    ): Promise<PreviewResponseDto> {
        Logger.info(
            `Starting preview for banned app: ${platform}/${appId}`,
            "FailoverService",
        );

        return await this.executeFailover(platform, appId, false);
    }

    private extractAppIdFromOfferName(offerName: string): string {
        // Простий regex для знаходження app_id (числа довжиною 10-13 символів)
        const match = offerName.match(/\d{10,13}/);
        return match ? match[0] : "unknown";
    }

    private async executeFailover(
        platform: string,
        appId: string,
        execute: boolean,
    ): Promise<PreviewResponseDto> {
        const campaignGroupId = this.configService.get<number>(
            "failover.campaignGroupId",
        );
        const bannedCampaignGroupId = this.configService.get<number>(
            "failover.bannedCampaignGroupId",
        );
        const minCampaignId = this.configService.get<number>(
            "failover.minCampaignId",
        );
        const pageSize = this.configService.get<number>(
            "failover.campaignsPageSize",
        );
        const defaultCampaignId = this.configService.get<number>(
            "failover.defaultCampaignId",
        );
        const bannedDomainGroupId = this.configService.get<number>(
            "failover.bannedDomainGroupId",
        );
        const privateOfferGroupId = this.configService.get<number>(
            "failover.privateOfferGroupId",
        );
        const publicOfferGroupId = this.configService.get<number>(
            "failover.publicOfferGroupId",
        );
        const bannedOfferGroupId = this.configService.get<number>(
            "failover.bannedOfferGroupId",
        );
        const defaultStreamId = this.configService.get<number>(
            "failover.defaultStreamId",
        );
        const expectedLandingId = this.configService.get<number>(
            "failover.streamLandingId",
        );

        // Step 1: Preview campaigns
        const campaigns = await this.keitaroService.getAllCampaignsFromMinId(
            appId,
            campaignGroupId,
            minCampaignId,
            pageSize,
        );

        const campaignsPreview = campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            currentGroupId: c.group_id,
            willMoveToGroupId: bannedCampaignGroupId,
        }));

        // Execute Step 1: Move campaigns if execute mode
        if (execute) {
            for (const campaign of campaigns) {
                try {
                    await this.keitaroService.updateCampaign(campaign.id, {
                        group_id: bannedCampaignGroupId,
                    });
                    Logger.debug(
                        `Moved campaign ${campaign.id} to banned group`,
                        "FailoverService",
                    );
                } catch (error) {
                    Logger.error(
                        `Failed to move campaign ${campaign.id}: ${error.message}`,
                        "FailoverService",
                    );
                }
            }
        }

        // Step 2: Preview domains
        const allDomains = await this.keitaroService.getDomains();
        const campaignIds = campaigns.map((c) => c.id);
        const domainsToUpdate = allDomains.filter((domain) =>
            campaignIds.includes(domain.default_campaign_id),
        );

        const domainsPreview = domainsToUpdate.map((d) => ({
            id: d.id,
            name: d.name,
            currentCampaignId: d.default_campaign_id,
            currentGroupId: d.group_id || null,
            willSetCampaignId: defaultCampaignId,
            willSetGroupId: bannedDomainGroupId,
        }));

        // Execute Step 2: Update domains if execute mode
        if (execute) {
            for (const domain of domainsToUpdate) {
                try {
                    await this.keitaroService.updateDomain(domain.id, {
                        default_campaign_id: defaultCampaignId,
                        group_id: bannedDomainGroupId,
                    });
                    Logger.debug(
                        `Updated domain ${domain.id} to default campaign`,
                        "FailoverService",
                    );
                } catch (error) {
                    Logger.error(
                        `Failed to update domain ${domain.id}: ${error.message}`,
                        "FailoverService",
                    );
                }
            }
        }

        // Step 3: Preview offers
        const allOffers = await this.keitaroService.getOffers();
        const offersToUpdate = allOffers.filter(
            (offer) =>
                offer.name.includes(appId) &&
                (offer.group_id === privateOfferGroupId ||
                    offer.group_id === publicOfferGroupId),
        );

        const offersPreview = offersToUpdate.map((o) => ({
            id: o.id,
            name: o.name,
            currentGroupId: o.group_id,
            willMoveToGroupId: bannedOfferGroupId,
        }));

        // Execute Step 3: Move offers if execute mode
        if (execute) {
            for (const offer of offersToUpdate) {
                try {
                    await this.keitaroService.updateOffer(offer.id, {
                        group_id: bannedOfferGroupId,
                    });
                    Logger.debug(
                        `Moved offer ${offer.id} to banned group`,
                        "FailoverService",
                    );
                } catch (error) {
                    Logger.error(
                        `Failed to move offer ${offer.id}: ${error.message}`,
                        "FailoverService",
                    );
                }
            }
        }

        // Get IDs of offers that will be banned
        const bannedOfferIds = offersToUpdate.map((o) => o.id);

        // Step 4: Preview stream changes
        const stream = await this.keitaroService.getStream(
            defaultCampaignId,
            defaultStreamId,
        );

        const expectedConfig = {
            type: "default",
            state: "active",
            action_type: "http",
            action_payload: "",
            schema: "landings",
        };

        const configIssues: string[] = [];
        if (stream.type !== expectedConfig.type)
            configIssues.push(
                `type: expected "${expectedConfig.type}", got "${stream.type}"`,
            );
        if (stream.state !== expectedConfig.state)
            configIssues.push(
                `state: expected "${expectedConfig.state}", got "${stream.state}"`,
            );
        if (stream.action_type !== expectedConfig.action_type)
            configIssues.push(
                `action_type: expected "${expectedConfig.action_type}", got "${stream.action_type}"`,
            );
        if (stream.action_payload !== expectedConfig.action_payload)
            configIssues.push(
                `action_payload: expected "${expectedConfig.action_payload}", got "${stream.action_payload}"`,
            );
        if (stream.schema !== expectedConfig.schema)
            configIssues.push(
                `schema: expected "${expectedConfig.schema}", got "${stream.schema}"`,
            );
        if (
            stream.landings?.length !== 1 ||
            stream.landings[0]?.landing_id !== expectedLandingId
        )
            configIssues.push(
                `landings: expected [${expectedLandingId}], got ${JSON.stringify(stream.landings)}`,
            );

        const currentOffer = stream.offers?.[0];
        let currentOfferDetails = null;
        let willReplaceOffer = false;
        let replacementOffer = null;

        if (currentOffer) {
            currentOfferDetails = await this.keitaroService.getOfferById(
                currentOffer.offer_id,
            );

            // Check if offer is already banned OR will be banned in step 3
            const isCurrentlyBanned =
                currentOfferDetails.group_id === bannedOfferGroupId;
            const willBeBanned = bannedOfferIds.includes(currentOffer.offer_id);
            const isBanned = isCurrentlyBanned || willBeBanned;

            if (isBanned) {
                willReplaceOffer = true;

                // Generate report to find replacement
                const reportPayload: ReportPayload = {
                    range: {
                        interval: "yesterday",
                        timezone: "Europe/Warsaw",
                    },
                    columns: [],
                    metrics: ["campaign_unique_clicks"],
                    grouping: ["offer_group_id", "offer_id"],
                    filters: [
                        {
                            name: "offer_group_id",
                            operator: "IN_LIST",
                            expression: [
                                privateOfferGroupId,
                                publicOfferGroupId,
                            ],
                        },
                        {
                            name: "is_unique_campaign",
                            operator: "IS_TRUE",
                            expression: null,
                        },
                    ],
                    sort: [
                        {
                            name: "campaign_unique_clicks",
                            order: "desc",
                        },
                    ],
                    summary: true,
                    limit: 100,
                    offset: 0,
                    extended: true,
                };

                const report =
                    await this.keitaroService.getReport(reportPayload);

                // Filter out banned offers from report results
                const validRows = report.rows.filter(
                    (row) => !bannedOfferIds.includes(row.offer_id),
                );

                let bestOffer = validRows.find(
                    (row) => row.offer_group_id === publicOfferGroupId,
                );
                let reason = "Best public offer by clicks";

                if (!bestOffer) {
                    bestOffer = validRows.find(
                        (row) => row.offer_group_id === privateOfferGroupId,
                    );
                    reason = "Best private offer by clicks (no public offers)";
                }

                if (bestOffer) {
                    const bestOfferDetails =
                        await this.keitaroService.getOfferById(
                            bestOffer.offer_id,
                        );
                    replacementOffer = {
                        id: bestOffer.offer_id,
                        name: bestOfferDetails.name,
                        groupId: bestOfferDetails.group_id,
                        clicks: bestOffer.campaign_unique_clicks,
                        reason,
                    };

                    // Execute Step 4: Update stream if execute mode
                    if (execute) {
                        try {
                            await this.keitaroService.updateStreamById(
                                defaultStreamId,
                                {
                                    offers: [
                                        {
                                            offer_id: bestOffer.offer_id,
                                            share: 100,
                                            state: "active",
                                        },
                                    ],
                                },
                            );
                            Logger.info(
                                `Updated stream ${defaultStreamId} with new offer ${bestOffer.offer_id}`,
                                "FailoverService",
                            );
                        } catch (error) {
                            Logger.error(
                                `Failed to update stream: ${error.message}`,
                                "FailoverService",
                            );
                        }
                    }
                }
            }
        }

        const totalOperations =
            campaigns.length +
            domainsToUpdate.length +
            offersToUpdate.length +
            (willReplaceOffer ? 1 : 0);

        return {
            summary: {
                appId,
                platform,
                totalOperations,
            },
            step1_campaigns: {
                found: campaigns.length,
                campaigns: campaignsPreview,
            },
            step2_domains: {
                found: domainsToUpdate.length,
                domains: domainsPreview,
            },
            step3_offers: {
                found: offersToUpdate.length,
                offers: offersPreview,
            },
            step4_stream: {
                streamId: defaultStreamId,
                campaignId: defaultCampaignId,
                configValid: configIssues.length === 0,
                ...(configIssues.length > 0 && { configIssues }),
                currentOffer: currentOfferDetails
                    ? {
                          id: currentOfferDetails.id,
                          name: currentOfferDetails.name,
                          groupId: currentOfferDetails.group_id,
                          isBanned:
                              currentOfferDetails.group_id ===
                                  bannedOfferGroupId ||
                              bannedOfferIds.includes(currentOfferDetails.id),
                      }
                    : null,
                willReplaceOffer,
                ...(replacementOffer && { replacementOffer }),
            },
        };
    }
}
