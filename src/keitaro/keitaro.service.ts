import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Logger } from "../utils/logger";

import { trafficSourceParams } from "./constants/traffic-source-params";
import { campaignParams } from "./constants/campaign-params";
import {
    streamParams,
    orgStreamParams,
    noOrgStreamParams,
} from "./constants/stream-params";
import { CreateCampaignInterface } from "./interfaces/create-campaign.interface";
import { generateUniqueAlias } from "../utils/generateUniqueAlias";
import { SyncAppResultInterface } from "../apps/interfaces/sync-app-result.interface";

@Injectable()
export class KeitaroService {
    private static readonly STREAM_NAMES = {
        TEST_FLOW: "test flow",
        FILTER_TEST_FLOW: "filter test flow",
        DENY_ALL_TRAFFIC: "deny all traffic",
        DENY_ORG_TRAFFIC: "deny org traffic",
        DEFAULT: "default",
    } as const;

    constructor(private readonly configService: ConfigService) {}

    async getOffers() {
        try {
            const url = this.buildUrl("admin_api/v1/offers");
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getOffers.name, error);
        }
    }

    async getOffer(id: string) {
        try {
            const url = this.buildUrl(`admin_api/v1/offers/${id}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getOffer.name, error);
        }
    }

    async getAllCampaigns() {
        try {
            const url = this.buildUrl("admin_api/v1/campaigns");
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getAllCampaigns.name, error);
        }
    }

    async getCampaignById(campaignId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getCampaignById.name, error);
        }
    }

    async getTrafficSourceById(trafficSourceId: number) {
        try {
            const url = this.buildUrl(
                `admin_api/v1/traffic_sources/${trafficSourceId}`,
            );
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getTrafficSourceById.name, error);
        }
    }

    async getGroupById(groupId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/groups/${groupId}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getGroupById.name, error);
        }
    }

    async getCampaignWithRelatedData(campaignId: number) {
        try {
            const [campaign, streams] = await Promise.all([
                this.getCampaignById(campaignId),
                this.getCampaignStreams(campaignId),
            ]);

            let trafficSource = null;
            let group = null;

            if (campaign.traffic_source_id) {
                try {
                    trafficSource = await this.getTrafficSourceById(
                        campaign.traffic_source_id,
                    );
                } catch {
                    Logger.warn(
                        `Failed to get traffic source ${campaign.traffic_source_id}`,
                        "KeitaroService",
                    );
                }
            }

            if (campaign.group_id) {
                try {
                    group = await this.getGroupById(campaign.group_id);
                } catch {
                    Logger.warn(
                        `Failed to get group ${campaign.group_id}`,
                        "KeitaroService",
                    );
                }
            }

            return {
                campaign,
                streams,
                trafficSource,
                group,
            };
        } catch (error) {
            this.handleKeitaroError(
                this.getCampaignWithRelatedData.name,
                error,
            );
        }
    }

    async getAffiliateNetworks() {
        try {
            const url = this.buildUrl("admin_api/v1/affiliate_networks");
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getAffiliateNetworks.name, error);
        }
    }

    async createAffiliateNetwork(affiliateNetworkBody: any) {
        try {
            const url = this.buildUrl("admin_api/v1/affiliate_networks");
            const response = await axios.post(url, affiliateNetworkBody, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createAffiliateNetwork.name, error);
        }
    }

    async createOffer(offerParams: any) {
        try {
            const url = this.buildUrl("admin_api/v1/offers");
            const response = await axios.post(url, offerParams, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createOffer.name, error);
        }
    }

    async getOfferById(offerId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/offers/${offerId}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getOfferById.name, error);
        }
    }

    async updateOffer(offerId: number, offerParams: any) {
        try {
            const url = this.buildUrl(`admin_api/v1/offers/${offerId}`);
            const response = await axios.put(url, offerParams, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.updateOffer.name, error);
        }
    }

    async deleteOffer(offerId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/offers/${offerId}/archive`);
            const response = await axios.delete(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.deleteOffer.name, error);
        }
    }

    async deleteCampaign(campaignId: string) {
        try {
            return this.deleteResource(
                "admin_api/v1/campaigns",
                Number(campaignId),
            );
        } catch (error) {
            this.handleKeitaroError(this.deleteCampaign.name, error);
        }
    }

    async deleteTrafficSource(trafficSourceId: string) {
        try {
            return this.deleteResource(
                "admin_api/v1/traffic_sources",
                Number(trafficSourceId),
            );
        } catch (error) {
            this.handleKeitaroError(this.deleteTrafficSource.name, error);
        }
    }

    async deleteAffiliateNetwork(affiliateNetworkId: number) {
        try {
            const url = this.buildUrl(
                `admin_api/v1/affiliate_networks/${affiliateNetworkId}`,
            );
            const response = await axios.delete(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.deleteAffiliateNetwork.name, error);
        }
    }

    async getAffiliateNetworkById(id: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/affiliate_networks/${id}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getAffiliateNetworkById.name, error);
        }
    }

    async createDomain(domain: string, groupId: number, oneLinkSettings: any) {
        try {
            const url = this.buildUrl("admin_api/v1/domains");
            const params = {
                name: domain,
                group_id: String(groupId),
                ssl_redirect: true,
                allow_indexing: false,
                admin_dashboard: false,
                catch_not_found: oneLinkSettings?.catch_not_found || false,
                default_campaign_id: oneLinkSettings?.default_campaign_id || 0,
            };

            const response = await axios.post(url, params, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createDomain.name, error);
        }
    }

    async getGroups(type: string) {
        try {
            const url = this.buildUrl("admin_api/v1/groups");
            const response = await axios.get(url, {
                params: {
                    type,
                },
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getGroups.name, error);
        }
    }

    async getDomains() {
        try {
            const url = this.buildUrl("admin_api/v1/domains");
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getDomains.name, error);
        }
    }

    async checkDomainExists(domainName: string): Promise<boolean> {
        try {
            const domains = await this.getDomains();
            return domains.some((domain: any) => domain.name === domainName);
        } catch (error) {
            this.handleKeitaroError(this.checkDomainExists.name, error);
        }
    }

    async getDomainById(domainId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/domains/${domainId}`);
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getDomainById.name, error);
        }
    }

    async deleteDomain(domainId: number) {
        try {
            return this.deleteResource("admin_api/v1/domains", domainId);
        } catch (error) {
            this.handleKeitaroError(this.deleteDomain.name, error);
        }
    }

    async createTrafficSource(
        name: string,
        sub_id: string = null,
        postback_url: string,
    ) {
        try {
            const url = this.buildUrl("admin_api/v1/traffic_sources");
            const params = trafficSourceParams(name, sub_id, postback_url);
            const response = await axios.post(url, params, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createTrafficSource.name, error);
        }
    }

    async createCampaign(data: CreateCampaignInterface) {
        try {
            const url = this.buildUrl("admin_api/v1/campaigns");
            const campaignPayload = campaignParams(data);

            const response = await axios.post(url, campaignPayload, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createCampaign.name, error);
        }
    }

    async createCLOCampaignStreams(
        campaignId: number,
        isAndroid: boolean,
        isIos: boolean,
    ) {
        try {
            const falseFilters = this.buildFalseFilters(isIos);
            const streamsData = streamParams(isAndroid, falseFilters);

            return await this.createStreamsAndExtractIds(
                campaignId,
                streamsData,
                {
                    true: "clTrueId",
                    false: "clFalseId",
                },
            );
        } catch (error) {
            this.handleKeitaroError(this.createCLOCampaignStreams.name, error);
        }
    }

    async createORGCampaignStreams(campaignId: number, isIos: boolean) {
        try {
            const falseFilters = this.buildFalseFilters(isIos);
            const streamsData = orgStreamParams(isIos, falseFilters);

            return await this.createStreamsAndExtractIds(
                campaignId,
                streamsData,
                {
                    false: "orgFalseId",
                },
            );
        } catch (error) {
            this.handleKeitaroError(this.createORGCampaignStreams.name, error);
        }
    }

    async createNoORGCampaignStreams(campaignId: number, isIos: boolean) {
        try {
            const streamsData = noOrgStreamParams(isIos);

            return await this.createStreamsAndExtractIds(
                campaignId,
                streamsData,
                {
                    false: "noOrgFalseId",
                },
            );
        } catch (error) {
            this.handleKeitaroError(
                this.createNoORGCampaignStreams.name,
                error,
            );
        }
    }

    async deleteResource(path: string, id: number) {
        try {
            const url = this.buildUrl(`${path}/${id}`);
            const response = await axios.delete(url, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.deleteResource.name, error);
        }
    }

    async copyCampaign(templateId: number) {
        try {
            const url = this.buildUrl(
                `admin_api/v1/campaigns/${templateId}/clone`,
            );
            const response = await axios.post(
                url,
                {},
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.copyCampaign.name, error);
        }
    }

    async updateCampaign(campaignId: number, updateData: any) {
        try {
            const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.updateCampaign.name, error);
        }
        // try {
        //     const updates: any[] = [];

        //     if (updateData.keitaroCloCampId) {
        //         updates.push(
        //             this.createCampaignUpdate(
        //                 updateData.keitaroCloCampId,
        //                 updateData.keitaroCloToken,
        //                 "keitaro_clo_campaign_id",
        //                 "keitaro_clo_token",
        //             ),
        //         );
        //     }

        //     if (updateData.keitaroOrgCampId) {
        //         updates.push(
        //             this.createCampaignUpdate(
        //                 updateData.keitaroOrgCampId,
        //                 updateData.keitaroOrgToken,
        //                 "keitaro_org_campaign_id",
        //                 "keitaro_org_token",
        //             ),
        //         );
        //     }

        //     if (updateData.keitaroSourceId) {
        //         updates.push(
        //             this.createSourceUpdate(
        //                 updateData.keitaroSourceId,
        //                 "keitaro_source_id",
        //             ),
        //         );
        //     }

        //     const results = await Promise.allSettled(
        //         updates.map(async (update) => {
        //             if (update.campaignId) {
        //                 return this.updateCampaign(
        //                     update.campaignId,
        //                     update.data,
        //                 );
        //             } else if (update.sourceId) {
        //                 return this.updateTrafficSource(
        //                     update.sourceId,
        //                     update.data,
        //                 );
        //             }
        //         }),
        //     );

        //     return {
        //         success: true,
        //         updates: results.map((result, index) => ({
        //             id: updates[index].campaignId || updates[index].sourceId,
        //             type: updates[index].campaignId
        //                 ? "campaign"
        //                 : "traffic_source",
        //             success: result.status === "fulfilled",
        //             data: result.status === "fulfilled" ? result.value : null,
        //             error: result.status === "rejected" ? result.reason : null,
        //         })),
        //     };
        // } catch (error) {
        //     this.logAxiosError("updateCampaign", error, {
        //         updateData,
        //     });
        //     throw error;
        // }
    }

    async updateTrafficSource(sourceId: number, updateData: any) {
        try {
            const url = this.buildUrl(
                `admin_api/v1/traffic_sources/${sourceId}`,
            );
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.updateTrafficSource.name, error);
        }
    }

    async syncAppWithKeitaro(appData: any): Promise<SyncAppResultInterface> {
        try {
            const updates: any[] = [];
            const results: SyncAppResultInterface = {
                success: true,
                updates: [],
                errors: [],
            };

            if (
                appData.keitaroSourceId &&
                appData.oldKeitaroSourceId === appData.keitaroSourceId
            ) {
                const trafficSourceUpdate: any = {
                    name: `${appData.name} (${appData.platform})`,
                };

                // Додаємо postback URL якщо вказана серверна інтеграція
                if (appData.serverIntegration) {
                    trafficSourceUpdate.postback_url = this.getPostbackUrl(
                        appData.serverIntegration,
                    );
                }

                updates.push(
                    this.updateTrafficSource(
                        parseInt(appData.keitaroSourceId),
                        trafficSourceUpdate,
                    )
                        .then((result) => ({
                            type: "traffic_source",
                            id: appData.keitaroSourceId,
                            success: true,
                            data: result,
                        }))
                        .catch((error) => ({
                            type: "traffic_source",
                            id: appData.keitaroSourceId,
                            success: false,
                            error: error.message,
                        })),
                );
            }

            if (
                appData.keitaroSourceId &&
                appData.oldKeitaroSourceId !== appData.keitaroSourceId &&
                appData.keitaroCloCampId
            ) {
                updates.push(
                    this.updateCampaign(parseInt(appData.keitaroCloCampId), {
                        traffic_source_id: parseInt(appData.keitaroSourceId),
                    })
                        .then((result) => ({
                            type: "clo_campaign_source_update",
                            id: appData.keitaroCloCampId,
                            success: true,
                            data: result,
                        }))
                        .catch((error) => ({
                            type: "clo_campaign_source_update",
                            id: appData.keitaroCloCampId,
                            success: false,
                            error: error.message,
                        })),
                );
            }

            if (appData.keitaroCloCampId) {
                const cloCampaignUpdate: any = {
                    name: `CLO ${appData.name} (${appData.platform})`,
                    group_id: this.configService.get("keitaro.cloGroupId"),
                    parameters: {
                        app_name: appData.name,
                        app_bundle: appData.id,
                        user_binding: "flow_rotation",
                        user_binding_type: "weight_based",
                        user_binding_target: "flows_landings_offers",
                        user_uniqueness: "ip_ua_cookie",
                        cookie_lifetime: 8760,
                    },
                };

                if (appData.keitaroSourceId) {
                    cloCampaignUpdate.traffic_source_id = parseInt(
                        appData.keitaroSourceId,
                    );
                }

                updates.push(
                    this.updateCampaign(
                        parseInt(appData.keitaroCloCampId),
                        cloCampaignUpdate,
                    )
                        .then((result) => ({
                            type: "clo_campaign",
                            id: appData.keitaroCloCampId,
                            success: true,
                            data: result,
                        }))
                        .catch((error) => ({
                            type: "clo_campaign",
                            id: appData.keitaroCloCampId,
                            success: false,
                            error: error.message,
                        })),
                );
            }

            if (appData.keitaroCloCampId && appData.namingStreams) {
                const namingStreamUpdates = await this.syncNamingStreams(
                    parseInt(appData.keitaroCloCampId),
                    appData.namingStreams,
                );
                updates.push(...namingStreamUpdates);
            }

            const updateResults = await Promise.allSettled(updates);

            updateResults.forEach((result) => {
                if (result.status === "fulfilled") {
                    results.updates.push(result.value);
                    if (!result.value.success) {
                        results.errors.push(result.value.error);
                    }
                } else {
                    results.errors.push(
                        result.reason?.message || "Unknown error",
                    );
                    results.success = false;
                }
            });

            if (results.errors.length > 0) {
                results.success = false;
            }

            return results;
        } catch (error) {
            this.handleKeitaroError(this.syncAppWithKeitaro.name, error);
        }
    }

    private async syncNamingStreams(
        campaignId: number,
        namingStreams: Array<{ naming: string; targetCampaignId: number }>,
    ): Promise<any[]> {
        const updates: any[] = [];

        try {
            // Отримуємо існуючі потоки кампанії
            const existingStreams = await this.getCampaignStreams(campaignId);

            // Знаходимо потоки з неймінгами (починаються з "Naming Share:")
            const existingNamingStreams = existingStreams.filter(
                (stream: any) => stream.name.startsWith("Naming Share:"),
            );

            // Створюємо мапу існуючих потоків для швидкого пошуку
            const existingNamingMap = new Map();
            existingNamingStreams.forEach((stream: any) => {
                const naming = stream.name.replace("Naming Share: ", "");
                existingNamingMap.set(naming, stream);
            });

            // Оновлюємо або створюємо потоки для кожного неймінгу
            for (const namingData of namingStreams) {
                const { naming, targetCampaignId } = namingData;

                if (existingNamingMap.has(naming)) {
                    // Оновлюємо існуючий потік
                    const existingStream = existingNamingMap.get(naming);
                    updates.push(
                        this.updateStream(existingStream.id, {
                            action_payload: targetCampaignId.toString(),
                            state: "active",
                        })
                            .then((result) => ({
                                type: "naming_stream_update",
                                id: existingStream.id,
                                naming: naming,
                                success: true,
                                data: result,
                            }))
                            .catch((error) => ({
                                type: "naming_stream_update",
                                id: existingStream.id,
                                naming: naming,
                                success: false,
                                error: error.message,
                            })),
                    );
                } else {
                    // Створюємо новий потік
                    updates.push(
                        this.shareNaming(campaignId, naming, targetCampaignId)
                            .then((result) => ({
                                type: "naming_stream_create",
                                id: result.id,
                                naming: naming,
                                success: true,
                                data: result,
                            }))
                            .catch((error) => ({
                                type: "naming_stream_create",
                                id: null,
                                naming: naming,
                                success: false,
                                error: error.message,
                            })),
                    );
                }
            }

            // Видаляємо потоки, які більше не потрібні
            const currentNamings = new Set(namingStreams.map((n) => n.naming));
            for (const [naming, stream] of existingNamingMap) {
                if (!currentNamings.has(naming)) {
                    updates.push(
                        this.deleteResource("admin_api/v1/streams", stream.id)
                            .then((result) => ({
                                type: "naming_stream_delete",
                                id: stream.id,
                                naming: naming,
                                success: true,
                                data: result,
                            }))
                            .catch((error) => ({
                                type: "naming_stream_delete",
                                id: stream.id,
                                naming: naming,
                                success: false,
                                error: error.message,
                            })),
                    );
                }
            }
        } catch (error) {
            this.handleKeitaroError(this.syncNamingStreams.name, error);
        }

        return updates;
    }

    private async updateStream(
        streamId: number,
        updateData: any,
    ): Promise<any> {
        try {
            const url = this.buildUrl(`admin_api/v1/streams/${streamId}`);
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.updateStream.name, error);
        }
    }

    private getPostbackUrl(serverIntegration: string): string {
        switch (serverIntegration) {
            case "LINK_FACTORY":
                return "https://postback.linkfactory.site/keitaro-postback?onesignalUserId={appsflyer_device_id}&deviceId={appsflyer_device_id}&advertisingId={advertising_id}&eventName={status}&appBundle={bundle_id}";
            case "PATRON":
                return "https://panel.panel-int.xyz/events_sender/?onesignal_id={onesignal_id}&advertising_id={advertising_id}&bundle_id={bundle_id}&status={status}&offer_id={offer_id}";
            default:
                throw new Error(
                    `Unknown server integration: ${serverIntegration}`,
                );
        }
    }

    async closeCloak(campaignId: number): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);

            let denyAllStream = streams.find((stream: any) => {
                const name = stream.name?.toLowerCase() || "";
                return (
                    name.includes("deny all traffic") ||
                    name.includes("deny all") ||
                    name.includes("block all")
                );
            });

            if (!denyAllStream) {
                denyAllStream = streams.find((stream: any) => {
                    return (
                        stream.type === "forced" &&
                        stream.action_type === "do_nothing" &&
                        (stream.name?.toLowerCase() === "false" ||
                            stream.filters?.length === 0 ||
                            (Array.isArray(stream.filters) &&
                                stream.filters.length > 0 &&
                                stream.filters.some(
                                    (f: any) =>
                                        f.name === "country" &&
                                        f.mode === "reject",
                                )))
                    );
                });
            }

            if (!denyAllStream) {
                Logger.warn(
                    "Deny all traffic stream not found",
                    {
                        campaignId,
                        availableStreams: streams.map((s: any) => ({
                            id: s.id,
                            name: s.name,
                            type: s.type,
                            action_type: s.action_type,
                            filters_count: s.filters?.length || 0,
                        })),
                    },
                    "KeitaroService.closeCloak",
                );
                throw new Error(
                    `Deny all traffic stream not found in campaign ${campaignId}. Available streams: ${streams.map((s: any) => s.name).join(", ")}`,
                );
            }

            const url = this.buildUrl(
                `admin_api/v1/streams/${denyAllStream.id}`,
            );
            const response = await axios.put(
                url,
                { state: "active" },
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.closeCloak.name, error);
        }
    }

    async allowAllTraffic(
        campaignId: number,
        shouldAllow: boolean,
    ): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);

            const denyAllStream = streams.find((stream: any) =>
                stream.name.toLowerCase().includes("deny all traffic"),
            );

            if (!denyAllStream) {
                throw new BadRequestException(
                    "Deny all traffic stream not found",
                );
            }

            const url = this.buildUrl(
                `admin_api/v1/streams/${denyAllStream.id}`,
            );
            const response = await axios.put(
                url,
                { state: shouldAllow ? "disabled" : "active" },
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.allowAllTraffic.name, error);
        }
    }

    async closeGeo(campaignId: number, geoCode: string): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);

            const closedGeoStream = streams.find((stream: any) =>
                stream.name.toLowerCase().includes("closed geo filter"),
            );

            if (!closedGeoStream) {
                throw new Error("Closed geo filter stream not found");
            }

            const existingFilters = [...(closedGeoStream.filters || [])];

            const countryFilter = existingFilters.find(
                (filter: any) =>
                    filter.name === "country" && filter.mode === "reject",
            );

            if (countryFilter) {
                const currentPayload = countryFilter.payload || [];

                if (currentPayload.includes(geoCode)) {
                    const url = this.buildUrl(
                        `admin_api/v1/streams/${closedGeoStream.id}`,
                    );
                    const response = await axios.put(
                        url,
                        { state: "active" },
                        {
                            headers: this.generateHeaders(),
                        },
                    );
                    return response.data;
                }

                const updatedPayload = [...currentPayload, geoCode];

                const updatedFilters = existingFilters.map((filter: any) => {
                    if (filter.id === countryFilter.id) {
                        return {
                            ...filter,
                            payload: updatedPayload,
                        };
                    }
                    return filter;
                });

                const url = this.buildUrl(
                    `admin_api/v1/streams/${closedGeoStream.id}`,
                );
                const response = await axios.put(
                    url,
                    {
                        filters: updatedFilters,
                        state: "active",
                    },
                    {
                        headers: this.generateHeaders(),
                    },
                );

                return response.data;
            } else {
                throw new Error(
                    "Country filter not found in closed geo filter stream",
                );
            }
        } catch (error) {
            this.handleKeitaroError(this.closeGeo.name, error);
        }
    }

    async shareNaming(
        campaignId: number,
        naming: string,
        targetCampaignId: number,
    ): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);
            const maxPosition = streams.reduce(
                (max, stream) => Math.max(max, stream.position || 0),
                0,
            );
            const nextPosition = maxPosition + 1;

            const streamData = {
                campaign_id: campaignId,
                name: `Naming Share: ${naming}`,
                type: "regular",
                position: nextPosition,
                state: "active",
                weight: 100,
                action_type: "campaign",
                action_payload: targetCampaignId.toString(),
                schema: "action",
                filters: [
                    {
                        name: "sub_id_17",
                        mode: "accept",
                        payload: [naming],
                    },
                ],
                offers: [],
                landings: [],
            };

            const url = this.buildUrl("admin_api/v1/streams");
            const response = await axios.post(url, streamData, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.shareNaming.name, error);
        }
    }

    async toggleTestFlow(campaignId: number, enable: boolean): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);
            const testFlow = streams.find(
                (stream: any) =>
                    stream.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.TEST_FLOW,
            );

            const isConfiguredCorrectly =
                testFlow &&
                testFlow.type === "forced" &&
                Array.isArray(testFlow.offers) &&
                testFlow.offers.length > 0;

            if (!isConfiguredCorrectly) {
                throw new BadRequestException(
                    "Test flow stream does not exist or is incorrectly configured",
                );
            }

            const url = this.buildUrl(`admin_api/v1/streams/${testFlow.id}`);
            const response = await axios.put(
                url,
                {
                    state: enable ? "active" : "disabled",
                },
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.toggleTestFlow.name, error);
        }
    }

    async getCampaignStreams(campaignId: number) {
        const url = this.buildUrl(
            `admin_api/v1/campaigns/${campaignId}/streams`,
        );

        try {
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getCampaignStreams.name, error);
        }
    }

    async updateNoOrgCampaignPostback(updateData: any, campaignId: number) {
        try {
            const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(
                this.updateNoOrgCampaignPostback.name,
                error,
            );
        }
    }

    async createStream(campaignId: number, streamData: any) {
        try {
            const url = this.buildUrl("admin_api/v1/streams");
            const params = {
                campaign_id: campaignId,
                ...streamData,
            };
            const response = await axios.post(url, params, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createStream.name, error);
        }
    }

    async createGroup(name: string, type: string) {
        try {
            const url = this.buildUrl("admin_api/v1/groups");
            const response = await axios.post(
                url,
                { name, type },
                {
                    headers: this.generateHeaders(),
                },
            );
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createGroup.name, error);
        }
    }

    async createRentOffer(offerParams: Record<string, any>) {
        try {
            const url = this.buildUrl("admin_api/v1/offers");
            const response = await axios.post(url, offerParams, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.createRentOffer.name, error);
        }
    }

    async createRentCampaign(groupId: number, offerId: number, name: string) {
        const cloneUrl = this.buildUrl(`admin_api/v1/campaigns/4509/clone`);

        try {
            const { data: template } = await axios.post(
                cloneUrl,
                {},
                {
                    headers: this.generateHeaders(),
                },
            );

            const alias = generateUniqueAlias();
            const newCampaignData = {
                alias,
                group_id: groupId,
                traffic_source_id: 918,
                name: `[Rent client] iOS ${name} ${alias}`,
                state: "active",
            };
            const campaignUrl = this.buildUrl(
                `admin_api/v1/campaigns/${template[0].id}`,
            );
            const { data: campaign } = await axios.put(
                campaignUrl,
                newCampaignData,
                {
                    headers: this.generateHeaders(),
                },
            );

            const streamsUrl = this.buildUrl(
                `admin_api/v1/campaigns/${campaign.id}/streams`,
            );
            const { data: stream } = await axios.get(streamsUrl, {
                headers: this.generateHeaders(),
            });
            const defaultStream = stream.find((s) => s.name === "Default");

            if (!defaultStream) {
                console.error("Default stream not found");
                return;
            }

            const streamUrl = this.buildUrl(
                `admin_api/v1/streams/${defaultStream.id}`,
            );
            await axios.put(
                streamUrl,
                {
                    ...defaultStream,
                    campaign_id: campaign.id,
                    weight: 100,
                    offers: [
                        {
                            offer_id: offerId,
                            share: 100,
                            state: "active",
                        },
                    ],
                },
                {
                    headers: this.generateHeaders(),
                },
            );

            return {
                alias: campaign.alias,
                clickApiToken: campaign.token,
            };
        } catch (error) {
            if (error instanceof axios.AxiosError) {
                this.handleKeitaroError(this.createRentCampaign.name, error);
            }
            throw error;
        }
    }

    private buildFalseFilters(isIos: boolean): string[] {
        const falseFilters = ["ZW", "UA", "PL"];
        if (isIos) {
            falseFilters.push("MD");
        }
        return falseFilters;
    }

    private async createStreamsAndExtractIds(
        campaignId: number,
        streamsData: any[],
        idMapping: Record<string, string>,
    ): Promise<Record<string, number | null>> {
        const result: Record<string, number | null> = {};

        Object.values(idMapping).forEach((key) => {
            result[key] = null;
        });

        for (const streamData of streamsData) {
            const stream = await this.createStream(campaignId, streamData);

            if (idMapping[streamData.name]) {
                result[idMapping[streamData.name]] = stream.id;
            }
        }

        return result;
    }

    async buildReport(body: Record<string, any>) {
        try {
            const url = this.buildUrl("admin_api/v1/report/build");
            const response = await axios.post(url, body, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.buildReport.name, error);
        }
    }

    async conversionLog(body: Record<string, any>) {
        try {
            const url = this.buildUrl("admin_api/v1/conversions/log");
            const response = await axios.post(url, body, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.conversionLog.name, error);
        }
    }

    async clicksLog(body: Record<string, any>) {
        try {
            const url = this.buildUrl("admin_api/v1/clicks/log");
            const response = await axios.post(url, body, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.clicksLog.name, error);
        }
    }

    private createCampaignUpdate(
        campaignId: string,
        token: string | undefined,
        campaignIdParam: string,
        tokenParam: string,
    ) {
        return {
            campaignId: parseInt(campaignId),
            data: {
                token: token || undefined,
                parameters: {
                    [campaignIdParam]: campaignId,
                    [tokenParam]: token,
                },
            },
        };
    }

    private createSourceUpdate(sourceId: string, sourceIdParam: string) {
        return {
            sourceId: parseInt(sourceId),
            data: {
                parameters: {
                    [sourceIdParam]: sourceId,
                },
            },
        };
    }

    private buildUrl(path: string): string {
        const stage = this.configService.get("NODE_ENV");
        const keitaroDomain =
            stage === "development"
                ? this.configService.get("keitaro.keitaroDomainDev")
                : this.configService.get("keitaro.keitaroDomain");
        return `${keitaroDomain}/${path}`;
    }

    private generateHeaders() {
        const nodeEnv = this.configService.get("NODE_ENV");
        const keitaroApiKey = this.configService.get("keitaro.apiKey");
        const keitaroApiKeyDev = this.configService.get("keitaro.apiKeyDev");
        return {
            "Api-Key":
                nodeEnv === "production" ? keitaroApiKey : keitaroApiKeyDev,
            "Content-Type": "application/json",
        };
    }

    async toggleDenyOrgTraffic(
        campaignId: number,
        enable: boolean,
    ): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);
            const denyOrgStream = streams.find(
                (stream: any) =>
                    stream.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.DENY_ORG_TRAFFIC,
            );

            if (!denyOrgStream) {
                throw new BadRequestException(
                    "Deny org traffic stream not found",
                );
            }

            const response = await axios.put(
                this.buildUrl(`admin_api/v1/streams/${denyOrgStream.id}`),
                {
                    state: enable ? "active" : "disabled",
                },
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.toggleDenyOrgTraffic.name, error);
        }
    }

    async validateIntegration(campaignId: number): Promise<any> {
        try {
            const streams = await this.getCampaignStreams(campaignId);
            const issues: any[] = [];
            const warnings: string[] = [];
            const createdStreams: any[] = [];

            const testFlow = streams.find(
                (s) =>
                    s.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.TEST_FLOW,
            );
            const denyAllTraffic = streams.find(
                (s) =>
                    s.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.DENY_ALL_TRAFFIC,
            );
            const denyOrgTraffic = streams.find(
                (s) =>
                    s.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.DENY_ORG_TRAFFIC,
            );
            const defaultFlow = streams.find((s) => s.type === "default");

            const defaultStreamData = {
                campaign_id: campaignId,
                type: "forced",
                action_payload: "",
                weight: 0,
                collect_clicks: true,
                offers: [],
                landings: [],
                triggers: [],
            };

            if (!testFlow) {
                const testFlowData = {
                    ...defaultStreamData,
                    name: KeitaroService.STREAM_NAMES.TEST_FLOW,
                    schema: "landings",
                    action_type: "http",
                    position: 1,
                    state: "disabled",
                    filter_or: false,
                    filters: [
                        {
                            name: "country",
                            mode: "accept",
                            payload: ["PL", "UA", "RO", "MD"],
                        },
                    ],
                    offers: [
                        {
                            queryCheckerOfferId: 3412,
                            share: 100,
                            state: "active",
                        },
                    ],
                };
                const created = await this.createStream(
                    campaignId,
                    testFlowData,
                );
                createdStreams.push({
                    name: KeitaroService.STREAM_NAMES.TEST_FLOW,
                    id: created.id,
                });
            }

            const testFlowFilter = streams.find(
                (s) =>
                    s.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
            );
            if (!testFlowFilter) {
                const filterData = {
                    ...defaultStreamData,
                    name: KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
                    schema: "action",
                    action_type: "do_nothing",
                    position: 1,
                    state: "disabled",
                    filter_or: false,
                    filters: [
                        {
                            name: "country",
                            mode: "accept",
                            payload: ["PL", "UA", "RO", "MD"],
                        },
                    ],
                };
                const created = await this.createStream(campaignId, filterData);
                createdStreams.push({
                    name: KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
                    id: created.id,
                });
            }

            if (!denyAllTraffic) {
                const denyAllData = {
                    ...defaultStreamData,
                    name: KeitaroService.STREAM_NAMES.DENY_ALL_TRAFFIC,
                    schema: "action",
                    action_type: "do_nothing",
                    position: 2,
                    state: "active",
                    filters: [],
                };
                const created = await this.createStream(
                    campaignId,
                    denyAllData,
                );
                createdStreams.push({
                    name: KeitaroService.STREAM_NAMES.DENY_ALL_TRAFFIC,
                    id: created.id,
                });
            }

            if (!denyOrgTraffic) {
                const denyOrgData = {
                    ...defaultStreamData,
                    name: KeitaroService.STREAM_NAMES.DENY_ORG_TRAFFIC,
                    schema: "action",
                    action_type: "do_nothing",
                    position: 3,
                    state: "disabled",
                    filter_or: false,
                    filters: [
                        { name: "sub_id_17", mode: "reject", payload: null },
                    ],
                };
                const created = await this.createStream(
                    campaignId,
                    denyOrgData,
                );
                createdStreams.push({
                    name: KeitaroService.STREAM_NAMES.DENY_ORG_TRAFFIC,
                    id: created.id,
                });
            }

            if (!defaultFlow) {
                issues.push({
                    type: "missing_default_flow",
                    streamName: KeitaroService.STREAM_NAMES.DEFAULT,
                    message:
                        "Default flow відсутній. Default flow має перенаправляти на ORG кампанію, а не на APP кампанію. Використайте updateDefaultFlowWithOrgCampaign для налаштування.",
                });
            } else if (
                defaultFlow.action_type === "campaign" &&
                defaultFlow.action_payload === campaignId.toString()
            ) {
                issues.push({
                    type: "self_redirect",
                    streamName: KeitaroService.STREAM_NAMES.DEFAULT,
                    message:
                        "Default flow налаштований на self-redirect (перенаправляє на саму кампанію). Має перенаправляти на ORG кампанію.",
                });
            }

            const filterFlows = streams.filter(
                (s) =>
                    s.name?.toLowerCase().startsWith("filter") &&
                    s.type === "forced",
            );
            for (const filterFlow of filterFlows) {
                if (!filterFlow.filters || filterFlow.filters.length === 0) {
                    issues.push({
                        type: "incorrect_config",
                        streamName: filterFlow.name,
                        message: "Filter потік має містити фільтри",
                    });
                }
                if (filterFlow.action_type) {
                    issues.push({
                        type: "incorrect_config",
                        streamName: filterFlow.name,
                        message: "Filter потік не має мати action_type",
                    });
                }
            }

            const namingFlows = streams.filter(
                (s) =>
                    s.name?.startsWith("Naming Share:") && s.type === "regular",
            );
            for (const namingFlow of namingFlows) {
                if (namingFlow.action_type !== "campaign") {
                    issues.push({
                        type: "incorrect_config",
                        streamName: namingFlow.name,
                        message: "Naming потік має мати action_type 'campaign'",
                    });
                }
                const hasSubId17Filter = namingFlow.filters?.some(
                    (f) => f.name === "sub_id_17",
                );
                if (!hasSubId17Filter) {
                    issues.push({
                        type: "incorrect_config",
                        streamName: namingFlow.name,
                        message: "Naming потік має містити фільтр sub_id_17",
                    });
                }
            }

            const allowedNames = [
                KeitaroService.STREAM_NAMES.TEST_FLOW,
                KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
                KeitaroService.STREAM_NAMES.DENY_ALL_TRAFFIC,
                KeitaroService.STREAM_NAMES.DENY_ORG_TRAFFIC,
                KeitaroService.STREAM_NAMES.DEFAULT,
            ];
            const extraStreams = streams.filter(
                (s) =>
                    !s.name?.startsWith("Naming Share:") &&
                    !s.name?.toLowerCase().startsWith("filter") &&
                    !allowedNames.includes(s.name?.toLowerCase()) &&
                    s.type !== "default",
            );
            if (extraStreams.length > 0) {
                warnings.push(
                    `Знайдено зайві потоки: ${extraStreams.map((s) => s.name).join(", ")}`,
                );
            }

            return {
                valid: issues.length === 0,
                warnings,
                createdStreams,
                issues,
            };
        } catch (error) {
            this.handleKeitaroError(this.validateIntegration.name, error);
        }
    }

    private handleKeitaroError(methodName: string, error: any): never {
        if (error instanceof axios.AxiosError) {
            (error as any).isKeitaroError = true;
            (error as any).keitaroMethod = methodName;
            throw error;
        }
        throw error;
    }
}
