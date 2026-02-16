import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { KeitaroService } from "../keitaro/keitaro.service";
import { Logger } from "../utils/logger";
import { ReportPayload } from "../keitaro/interfaces/failover.interface";
import { PreviewResponseDto } from "./dto/app-banned.dto";
import { TelegramService } from "../notifications/telegram.service";
import {
    FailoverConfig,
    CampaignResult,
    DomainResult,
    OfferResult,
    StreamResult,
} from "./interfaces/failover-internal.interface";

@Injectable()
export class FailoverService {
    constructor(
        private readonly keitaroService: KeitaroService,
        private readonly configService: ConfigService,
        private readonly telegramService: TelegramService,
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

    private getFailoverConfig(): FailoverConfig {
        return {
            campaignGroupId: this.configService.get<number>(
                "failover.campaignGroupId",
            ),
            bannedCampaignGroupId: this.configService.get<number>(
                "failover.bannedCampaignGroupId",
            ),
            minCampaignId: this.configService.get<number>(
                "failover.minCampaignId",
            ),
            pageSize: this.configService.get<number>(
                "failover.campaignsPageSize",
            ),
            defaultCampaignId: this.configService.get<number>(
                "failover.defaultCampaignId",
            ),
            bannedDomainGroupId: this.configService.get<number>(
                "failover.bannedDomainGroupId",
            ),
            privateOfferGroupId: this.configService.get<number>(
                "failover.privateOfferGroupId",
            ),
            publicOfferGroupId: this.configService.get<number>(
                "failover.publicOfferGroupId",
            ),
            bannedOfferGroupId: this.configService.get<number>(
                "failover.bannedOfferGroupId",
            ),
            defaultStreamId: this.configService.get<number>(
                "failover.defaultStreamId",
            ),
            expectedLandingId: this.configService.get<number>(
                "failover.streamLandingId",
            ),
        };
    }

    private async executeFailover(
        platform: string,
        appId: string,
        execute: boolean,
    ): Promise<PreviewResponseDto> {
        const config = this.getFailoverConfig();

        // Execute all steps
        const campaignResult = await this.executeStep1Campaigns(
            appId,
            config,
            execute,
        );

        const domainResult = await this.executeStep2Domains(
            campaignResult.campaigns,
            config,
            execute,
        );

        const offerResult = await this.executeStep3Offers(
            appId,
            config,
            execute,
        );

        let streamResult: StreamResult;
        try {
            streamResult = await this.executeStep4Stream(
                platform,
                appId,
                config,
                offerResult.bannedOfferIds,
                execute,
            );
        } catch (err) {
            const message =
                err?.message ?? err?.toString?.() ?? "Unknown error";
            Logger.error(
                `Step 4 (stream) failed after retries: ${message}`,
                "FailoverService",
            );
            streamResult = {
                configIssues: [],
                currentOfferDetails: null,
                willReplaceOffer: false,
                replacementOffer: null,
                error: message,
            };
        }

        // Calculate total operations
        const totalOperations =
            campaignResult.campaigns.length +
            domainResult.domainsToUpdate.length +
            offerResult.offersToUpdate.length +
            (streamResult.willReplaceOffer ? 1 : 0);

        return {
            summary: {
                appId,
                platform,
                totalOperations,
            },
            step1_campaigns: {
                found: campaignResult.campaigns.length,
                campaigns: campaignResult.campaignsPreview,
            },
            step2_domains: {
                found: domainResult.domainsToUpdate.length,
                domains: domainResult.domainsPreview,
            },
            step3_offers: {
                found: offerResult.offersToUpdate.length,
                offers: offerResult.offersPreview,
            },
            step4_stream: {
                streamId: config.defaultStreamId,
                campaignId: config.defaultCampaignId,
                configValid: streamResult.configIssues.length === 0,
                ...(streamResult.configIssues.length > 0 && {
                    configIssues: streamResult.configIssues,
                }),
                ...(streamResult.error && { error: streamResult.error }),
                currentOffer: streamResult.currentOfferDetails
                    ? {
                          id: streamResult.currentOfferDetails.id,
                          name: streamResult.currentOfferDetails.name,
                          groupId: streamResult.currentOfferDetails.group_id,
                          isBanned:
                              streamResult.currentOfferDetails.group_id ===
                                  config.bannedOfferGroupId ||
                              offerResult.bannedOfferIds.includes(
                                  streamResult.currentOfferDetails.id,
                              ),
                      }
                    : null,
                willReplaceOffer: streamResult.willReplaceOffer,
                ...(streamResult.replacementOffer && {
                    replacementOffer: streamResult.replacementOffer,
                }),
            },
        };
    }

    /**
     * Step 1: Handle campaigns - find and move banned app campaigns
     */
    private async executeStep1Campaigns(
        appId: string,
        config: FailoverConfig,
        execute: boolean,
    ): Promise<CampaignResult> {
        const campaigns = await this.keitaroService.getAllCampaignsFromMinId(
            appId,
            config.campaignGroupId,
            config.minCampaignId,
            config.pageSize,
        );

        const campaignsPreview = campaigns.map((c) => ({
            id: c.id,
            name: c.name,
            currentGroupId: c.group_id,
            willMoveToGroupId: config.bannedCampaignGroupId,
        }));

        if (execute) {
            for (const campaign of campaigns) {
                try {
                    await this.keitaroService.updateCampaign(campaign.id, {
                        group_id: config.bannedCampaignGroupId,
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

        return { campaigns, campaignsPreview };
    }

    /**
     * Step 2: Handle domains - update domains linked to banned campaigns
     */
    private async executeStep2Domains(
        campaigns: any[],
        config: FailoverConfig,
        execute: boolean,
    ): Promise<DomainResult> {
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
            willSetCampaignId: config.defaultCampaignId,
            willSetGroupId: config.bannedDomainGroupId,
        }));

        if (execute) {
            for (const domain of domainsToUpdate) {
                try {
                    await this.keitaroService.updateDomain(domain.id, {
                        default_campaign_id: config.defaultCampaignId,
                        group_id: config.bannedDomainGroupId,
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

        return { domainsToUpdate, domainsPreview };
    }

    /**
     * Step 3: Handle offers - move banned app offers to banned group
     */
    private async executeStep3Offers(
        appId: string,
        config: FailoverConfig,
        execute: boolean,
    ): Promise<OfferResult> {
        const allOffers = await this.keitaroService.getOffers();
        const offersToUpdate = allOffers.filter(
            (offer) =>
                offer.name.includes(appId) &&
                (offer.group_id === config.privateOfferGroupId ||
                    offer.group_id === config.publicOfferGroupId),
        );

        const offersPreview = offersToUpdate.map((o) => ({
            id: o.id,
            name: o.name,
            currentGroupId: o.group_id,
            willMoveToGroupId: config.bannedOfferGroupId,
        }));

        if (execute) {
            for (const offer of offersToUpdate) {
                try {
                    await this.keitaroService.updateOffer(offer.id, {
                        group_id: config.bannedOfferGroupId,
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

        const bannedOfferIds = offersToUpdate.map((o) => o.id);
        return { offersToUpdate, offersPreview, bannedOfferIds };
    }

    /**
     * Step 4: Handle stream - validate config and replace banned offer if needed
     */
    private async executeStep4Stream(
        platform: string,
        appId: string,
        config: FailoverConfig,
        bannedOfferIds: number[],
        execute: boolean,
    ): Promise<StreamResult> {
        const stream = await this.keitaroService.getStream(
            config.defaultCampaignId,
            config.defaultStreamId,
        );

        // Validate stream configuration
        const configIssues = this.validateStreamConfig(
            stream,
            config.expectedLandingId,
        );

        // Send alert if configuration issues are detected
        if (configIssues.length > 0 && execute) {
            await this.telegramService.sendStreamConfigAlert(
                configIssues,
                config.defaultStreamId,
                config.defaultCampaignId,
            );
        }

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
                currentOfferDetails.group_id === config.bannedOfferGroupId;
            const willBeBanned = bannedOfferIds.includes(currentOffer.offer_id);
            const isBanned = isCurrentlyBanned || willBeBanned;

            if (isBanned) {
                willReplaceOffer = true;
                replacementOffer = await this.findAndReplaceOffer(
                    platform,
                    appId,
                    config,
                    bannedOfferIds,
                    execute,
                );
            }
        }

        return {
            configIssues,
            currentOfferDetails,
            willReplaceOffer,
            replacementOffer,
        };
    }

    /**
     * Validate stream configuration against expected values
     */
    private validateStreamConfig(
        stream: any,
        expectedLandingId: number,
    ): string[] {
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

        return configIssues;
    }

    /**
     * Find best replacement offer and update stream
     */
    private async findAndReplaceOffer(
        platform: string,
        appId: string,
        config: FailoverConfig,
        bannedOfferIds: number[],
        execute: boolean,
    ): Promise<any> {
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
                        config.privateOfferGroupId,
                        config.publicOfferGroupId,
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

        const report = await this.keitaroService.getReport(reportPayload);

        // Filter out banned offers from report results
        const validRows = report.rows.filter(
            (row) => !bannedOfferIds.includes(row.offer_id),
        );

        let bestOffer = validRows.find(
            (row) => row.offer_group_id === config.publicOfferGroupId,
        );
        let reason = "Best public offer by clicks";

        if (!bestOffer) {
            bestOffer = validRows.find(
                (row) => row.offer_group_id === config.privateOfferGroupId,
            );
            reason = "Best private offer by clicks (no public offers)";
        }

        if (!bestOffer) {
            return null;
        }

        const bestOfferDetails = await this.keitaroService.getOfferById(
            bestOffer.offer_id,
        );

        const replacementOffer = {
            id: bestOffer.offer_id,
            name: bestOfferDetails.name,
            groupId: bestOfferDetails.group_id,
            clicks: bestOffer.campaign_unique_clicks,
            reason,
        };

        // Execute: Update stream if execute mode
        if (execute) {
            try {
                await this.keitaroService.updateStreamById(
                    config.defaultStreamId,
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
                    `Updated stream ${config.defaultStreamId} with new offer ${bestOffer.offer_id}`,
                    "FailoverService",
                );

                // Send Telegram notification about successful failover
                const currentAppId = this.extractAppIdFromOfferName(
                    bestOfferDetails.name,
                );
                await this.telegramService.sendFailoverSuccessAlert(
                    appId,
                    currentAppId,
                    platform,
                );
            } catch (error) {
                Logger.error(
                    `Failed to update stream: ${error.message}`,
                    "FailoverService",
                );
            }
        }

        return replacementOffer;
    }
}
