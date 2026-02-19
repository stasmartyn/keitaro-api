import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Logger } from "../utils/logger";
import { withRetry } from "../utils/retry.util";
import {
    Campaign,
    Domain,
    Stream,
    RegularStream,
    ReportPayload,
    ReportResponse,
} from "./interfaces/failover.interface";

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

    async createCampaign(
        data: CreateCampaignInterface,
        isOnelink: boolean = false,
    ) {
        try {
            const url = this.buildUrl("admin_api/v1/campaigns");
            const campaignPayload = campaignParams(data, isOnelink);

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
            const testFlowOfferId = this.configService.get(
                "keitaro.testFlowOfferId",
            );
            const streamsData = orgStreamParams(
                isIos,
                falseFilters,
                testFlowOfferId,
            );

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
            const testFlowOfferId = this.configService.get(
                "keitaro.testFlowOfferId",
            );
            const streamsData = noOrgStreamParams(isIos, testFlowOfferId);

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

                updates.push(
                    this.shareNaming(campaignId, naming, targetCampaignId)
                        .then((result) => {
                            const streamId = result.stream?.id;
                            return {
                                type:
                                    result.created > 0
                                        ? "naming_stream_create"
                                        : result.updated > 0
                                          ? "naming_stream_update"
                                          : "naming_stream_skip",
                                id: streamId,
                                naming: naming,
                                success: true,
                                data: result,
                            };
                        })
                        .catch((error) => ({
                            type: "naming_stream_error",
                            id: null,
                            naming: naming,
                            success: false,
                            error: error.message,
                        })),
                );
            }

            // НЕ видаляємо автоматично потоки, які більше не потрібні
            // Згідно з логікою: CRM - single source of truth, але streams в Keitaro залишаються
            // навіть якщо їх немає в CRM (для можливості ручного підтримування)
            // Якщо в Keitaro є stream, а в CRM його немає - показуємо warning, але не видаляємо
            const currentNamings = new Set(namingStreams.map((n) => n.naming));
            for (const [naming, stream] of existingNamingMap) {
                if (!currentNamings.has(naming)) {
                    Logger.warn(
                        `Stream "${stream.name}" (id: ${stream.id}) exists in Keitaro but not in CRM naming list. Keeping stream for manual maintenance.`,
                        undefined,
                        "KeitaroService.syncNamingStreams",
                    );
                    // Не видаляємо stream - залишаємо для ручного підтримування
                    // Якщо потрібно видалити - це має бути зроблено вручну в Keitaro
                }
            }
        } catch (error) {
            this.handleKeitaroError(this.syncNamingStreams.name, error);
        }

        return updates;
    }

    async updateStream(streamId: number, updateData: any): Promise<any> {
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

    /**
     * Створює або оновлює default flow в APP campaign з редиректом на ORG campaign
     * @param appCampaignId - ID APP campaign
     * @param orgCampaignId - ID ORG campaign для редиректу
     */
    async updateDefaultFlowWithOrgCampaign(
        appCampaignId: number,
        orgCampaignId: number,
    ): Promise<any> {
        try {
            Logger.info(
                `Setting up default flow for APP campaign ${appCampaignId} to redirect to ORG campaign ${orgCampaignId}`,
                { appCampaignId, orgCampaignId },
                "KeitaroService.updateDefaultFlowWithOrgCampaign",
            );

            // Отримуємо всі streams для APP campaign
            const streams = await this.getCampaignStreams(appCampaignId);

            // Шукаємо default flow
            const defaultFlow = streams.find((s) => s.type === "default");

            const defaultFlowData = {
                type: "default",
                action_type: "campaign",
                action_payload: orgCampaignId.toString(),
                schema: "action",
                state: "active",
                collect_clicks: true,
                filter_or: false,
                filters: [],
                triggers: [],
                landings: [],
                offers: [],
            };

            if (defaultFlow) {
                // Оновлюємо існуючий default flow
                Logger.info(
                    `Updating existing default flow (ID: ${defaultFlow.id}) in APP campaign ${appCampaignId}`,
                    {
                        appCampaignId,
                        orgCampaignId,
                        defaultFlowId: defaultFlow.id,
                    },
                    "KeitaroService.updateDefaultFlowWithOrgCampaign",
                );

                const updated = await this.updateStream(defaultFlow.id, {
                    action_type: "campaign",
                    action_payload: orgCampaignId.toString(),
                    state: "active",
                });

                Logger.info(
                    `Default flow updated successfully in APP campaign ${appCampaignId}`,
                    {
                        appCampaignId,
                        orgCampaignId,
                        defaultFlowId: defaultFlow.id,
                    },
                    "KeitaroService.updateDefaultFlowWithOrgCampaign",
                );

                return updated;
            } else {
                // Створюємо новий default flow
                Logger.info(
                    `Creating new default flow in APP campaign ${appCampaignId}`,
                    { appCampaignId, orgCampaignId },
                    "KeitaroService.updateDefaultFlowWithOrgCampaign",
                );

                // Знаходимо максимальну позицію для встановлення default flow в кінці
                const maxPosition = streams.reduce(
                    (max, stream) => Math.max(max, stream.position || 0),
                    0,
                );

                const created = await this.createStream(appCampaignId, {
                    ...defaultFlowData,
                    name: KeitaroService.STREAM_NAMES.DEFAULT,
                    position: maxPosition + 1,
                });

                Logger.info(
                    `Default flow created successfully in APP campaign ${appCampaignId}`,
                    {
                        appCampaignId,
                        orgCampaignId,
                        defaultFlowId: created.id,
                    },
                    "KeitaroService.updateDefaultFlowWithOrgCampaign",
                );

                return created;
            }
        } catch (error) {
            Logger.error(
                `Failed to setup default flow for APP campaign ${appCampaignId}`,
                error instanceof Error ? error.stack : undefined,
                "KeitaroService.updateDefaultFlowWithOrgCampaign",
            );
            this.handleKeitaroError(
                this.updateDefaultFlowWithOrgCampaign.name,
                error,
            );
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
                { state: shouldAllow ? "active" : "disabled" },
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
        oldCampaignId?: number | null, // Стара кампанія для міграції stream
    ): Promise<{
        created: number;
        updated: number;
        skipped: number;
        stream?: RegularStream;
    }> {
        const stage = this.configService.get("NODE_ENV");
        const keitaroDomainDev = this.configService.get(
            "keitaro.keitaroDomainDev",
        );
        const keitaroDomainProd = this.configService.get(
            "keitaro.keitaroDomain",
        );
        const keitaroDomain =
            stage === "development" ? keitaroDomainDev : keitaroDomainProd;

        if (!keitaroDomain) {
            throw new Error(
                "Invalid URL: keitaroDomain is not configured. Please set KEITARO_DOMAIN or KEITARO_DOMAIN_DEV in .env",
            );
        }

        try {
            Logger.info(
                `Starting shareNaming: campaignId=${campaignId}, naming="${naming}", targetCampaignId=${targetCampaignId}`,
                undefined,
                "KeitaroService.shareNaming",
            );

            const streams = await this.getCampaignStreams(campaignId);
            Logger.info(
                `Found ${streams.length} streams in campaign ${campaignId}`,
                undefined,
                "KeitaroService.shareNaming",
            );

            // Keitaro API обмежує назву stream до 100 символів
            // Обрізаємо naming, якщо він занадто довгий
            const maxStreamNameLength = 100;
            const baseName = `Naming Share: `;
            const maxNamingLength = maxStreamNameLength - baseName.length;
            let truncatedNaming = naming;
            if (naming.length > maxNamingLength) {
                truncatedNaming = naming.substring(0, maxNamingLength);
                Logger.warn(
                    `Naming "${naming}" exceeds maximum length (${naming.length} > ${maxNamingLength}). Truncated to "${truncatedNaming}" for stream name`,
                    undefined,
                    "KeitaroService.shareNaming",
                );
            }
            const streamName = `${baseName}${truncatedNaming}`;
            const targetCampaignIdString = targetCampaignId.toString();

            Logger.info(
                `Looking for stream "${streamName}" in campaign ${campaignId}`,
                undefined,
                "KeitaroService.shareNaming",
            );

            // find() достатньо ефективний для одного пошуку (5-10k записів за мілісекунди)
            // Map був би корисний тільки якщо потрібно багато разів працювати з даними
            let existingStream = streams.find((s) => s.name === streamName) as
                | RegularStream
                | undefined;

            // Якщо stream не знайдено в новій кампанії, але є oldCampaignId - шукаємо в старій кампанії
            if (
                !existingStream &&
                oldCampaignId &&
                oldCampaignId !== campaignId
            ) {
                Logger.info(
                    `Stream "${streamName}" not found in campaign ${campaignId}. Searching in old campaign ${oldCampaignId}...`,
                    undefined,
                    "KeitaroService.shareNaming",
                );
                const oldStreams = await this.getCampaignStreams(oldCampaignId);
                existingStream = oldStreams.find(
                    (s) => s.name === streamName,
                ) as RegularStream | undefined;

                if (existingStream) {
                    Logger.warn(
                        `Stream "${streamName}" found in old campaign ${oldCampaignId} (id: ${existingStream.id}). Will migrate to new campaign ${campaignId}.`,
                        {
                            streamId: existingStream.id,
                            oldCampaignId,
                            newCampaignId: campaignId,
                        },
                        "KeitaroService.shareNaming",
                    );
                }
            }

            if (existingStream) {
                // Перевіряємо, чи stream в правильній кампанії
                const isInCorrectCampaign =
                    existingStream.campaign_id === campaignId;

                Logger.info(
                    `Stream "${streamName}" found in campaign ${campaignId} (stream id: ${existingStream.id}, stream campaign_id: ${existingStream.campaign_id}, action_payload: ${existingStream.action_payload}, isInCorrectCampaign: ${isInCorrectCampaign})`,
                    {
                        streamId: existingStream.id,
                        streamCampaignId: existingStream.campaign_id,
                        targetCampaignId: campaignId,
                        actionPayload: existingStream.action_payload,
                        expectedTargetCampaignId: targetCampaignIdString,
                        isInCorrectCampaign,
                    },
                    "KeitaroService.shareNaming",
                );

                if (!isInCorrectCampaign) {
                    Logger.warn(
                        `Stream "${streamName}" is in wrong campaign! Stream campaign_id: ${existingStream.campaign_id}, expected: ${campaignId}. This might indicate that naming.keitaroCampaign was changed in CRM.`,
                        {
                            streamId: existingStream.id,
                            streamCampaignId: existingStream.campaign_id,
                            expectedCampaignId: campaignId,
                        },
                        "KeitaroService.shareNaming",
                    );
                }

                // Повна валідація stream: перевіряємо всі поля, які мають відповідати CRM
                const subId17Filter = existingStream.filters?.find(
                    (f: any) => f.name === "sub_id_17",
                );
                const existingNamingInFilter = subId17Filter?.payload?.[0];
                const isActionPayloadCorrect =
                    existingStream.action_payload === targetCampaignIdString;
                const isNamingCorrect = existingNamingInFilter === naming;
                const isStateCorrect = existingStream.state === "active";
                const isActionTypeCorrect =
                    existingStream.action_type === "campaign";
                const isTypeCorrect = existingStream.type === "regular";

                Logger.info(
                    `Validation results for stream "${streamName}": campaign=${isInCorrectCampaign}, action_payload=${isActionPayloadCorrect}, naming=${isNamingCorrect}, state=${isStateCorrect}, action_type=${isActionTypeCorrect}, type=${isTypeCorrect}`,
                    {
                        isInCorrectCampaign,
                        isActionPayloadCorrect,
                        isNamingCorrect,
                        isStateCorrect,
                        isActionTypeCorrect,
                        isTypeCorrect,
                        existingCampaignId: existingStream.campaign_id,
                        expectedCampaignId: campaignId,
                        existingActionPayload: existingStream.action_payload,
                        expectedActionPayload: targetCampaignIdString,
                        existingNaming: existingNamingInFilter,
                        expectedNaming: naming,
                    },
                    "KeitaroService.shareNaming",
                );

                const isFullyValid =
                    isInCorrectCampaign &&
                    isActionPayloadCorrect &&
                    isNamingCorrect &&
                    isStateCorrect &&
                    isActionTypeCorrect &&
                    isTypeCorrect;

                if (isFullyValid) {
                    Logger.info(
                        `Stream "${streamName}" already configured correctly (all fields match), skipping`,
                        undefined,
                        "KeitaroService.shareNaming",
                    );
                    return {
                        created: 0,
                        updated: 0,
                        skipped: 1,
                        stream: existingStream,
                    };
                }

                // Якщо щось не відповідає - оновлюємо stream
                const mismatches: string[] = [];
                if (!isInCorrectCampaign) {
                    mismatches.push(
                        `campaign_id: ${existingStream.campaign_id} -> ${campaignId} (naming.keitaroCampaign changed in CRM)`,
                    );
                }
                if (!isActionPayloadCorrect) {
                    mismatches.push(
                        `action_payload: ${existingStream.action_payload} -> ${targetCampaignIdString}`,
                    );
                }
                if (!isNamingCorrect) {
                    mismatches.push(
                        `naming in filter: ${existingNamingInFilter || "missing"} -> ${naming}`,
                    );
                }
                if (!isStateCorrect) {
                    mismatches.push(`state: ${existingStream.state} -> active`);
                }
                if (!isActionTypeCorrect) {
                    mismatches.push(
                        `action_type: ${existingStream.action_type} -> campaign`,
                    );
                }
                if (!isTypeCorrect) {
                    mismatches.push(`type: ${existingStream.type} -> regular`);
                }

                Logger.info(
                    `Stream "${streamName}" needs update. Mismatches: ${mismatches.join(", ")}`,
                    {
                        mismatches,
                        streamId: existingStream.id,
                        currentCampaignId: existingStream.campaign_id,
                        expectedCampaignId: campaignId,
                    },
                    "KeitaroService.shareNaming",
                );

                // Якщо stream в неправильній кампанії - це означає, що naming.keitaroCampaign змінився
                // Потрібно видалити stream зі старої кампанії та створити в новій
                if (!isInCorrectCampaign) {
                    Logger.warn(
                        `Stream "${streamName}" is in wrong campaign (${existingStream.campaign_id} instead of ${campaignId}). This indicates naming.keitaroCampaign was changed in CRM. Deleting old stream and creating new one in correct campaign.`,
                        {
                            streamId: existingStream.id,
                            oldCampaignId: existingStream.campaign_id,
                            newCampaignId: campaignId,
                        },
                        "KeitaroService.shareNaming",
                    );
                    try {
                        await this.deleteResource(
                            "admin_api/v1/streams",
                            existingStream.id,
                        );
                        Logger.info(
                            `Deleted stream "${streamName}" (id: ${existingStream.id}) from old campaign ${existingStream.campaign_id}. Will create new stream in campaign ${campaignId}`,
                            undefined,
                            "KeitaroService.shareNaming",
                        );
                    } catch (deleteError) {
                        Logger.error(
                            `Failed to delete stream "${streamName}" from old campaign: ${deleteError instanceof Error ? deleteError.message : "Unknown error"}`,
                            deleteError instanceof Error
                                ? deleteError.stack
                                : undefined,
                            "KeitaroService.shareNaming",
                        );
                        // Продовжуємо - спробуємо створити новий stream
                    }
                    // Після видалення - виходимо з блоку і створюємо новий stream (код нижче)
                    // Не оновлюємо існуючий stream, бо він в неправильній кампанії
                } else {
                    // Оновлюємо всі поля, які не відповідають
                    const updateData: any = {
                        state: "active",
                        action_payload: targetCampaignIdString,
                        action_type: "campaign",
                        type: "regular",
                    };

                    // Оновлюємо filters, якщо naming не відповідає
                    if (!isNamingCorrect) {
                        const updatedFilters = existingStream.filters?.map(
                            (f: any) => {
                                if (f.name === "sub_id_17") {
                                    return {
                                        name: "sub_id_17",
                                        mode: "accept",
                                        payload: [naming],
                                    };
                                }
                                return f;
                            },
                        ) || [
                            {
                                name: "sub_id_17",
                                mode: "accept",
                                payload: [naming],
                            },
                        ];
                        updateData.filters = updatedFilters;
                    }

                    Logger.info(
                        `Updating stream "${streamName}" with corrections: ${JSON.stringify(updateData)}`,
                        { streamId: existingStream.id, mismatches },
                        "KeitaroService.shareNaming",
                    );

                    const updatedStream = await this.updateStream(
                        existingStream.id,
                        updateData,
                    );
                    Logger.info(
                        `Stream "${streamName}" updated successfully with all corrections`,
                        { streamId: updatedStream?.id, mismatches },
                        "KeitaroService.shareNaming",
                    );
                    return {
                        created: 0,
                        updated: 1,
                        skipped: 0,
                        stream: updatedStream as RegularStream,
                    };
                }
            }

            // Обчислюємо position після перевірки existing stream
            // Це гарантує унікальність position при послідовній обробці
            const maxPosition = streams.reduce(
                (max, stream) => Math.max(max, stream.position || 0),
                0,
            );
            const nextPosition = maxPosition + 1;

            const streamData = {
                campaign_id: campaignId,
                name: streamName,
                type: "regular",
                position: nextPosition,
                state: "active",
                weight: 100,
                action_type: "campaign",
                action_payload: targetCampaignIdString,
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

            Logger.info(
                `Creating stream for naming "${naming}" in campaign ${campaignId}, target: ${targetCampaignId}`,
                { streamData },
                "KeitaroService.shareNaming",
            );

            const response = await axios.post(url, streamData, {
                headers: this.generateHeaders(),
            });

            Logger.info(
                `Stream created successfully for naming "${naming}"`,
                { streamId: response.data?.id },
                "KeitaroService.shareNaming",
            );

            return {
                created: 1,
                updated: 0,
                skipped: 0,
                stream: response.data as RegularStream,
            };
        } catch (error: any) {
            // Детальне логування помилок від Keitaro API
            if (error?.response) {
                const errorDetails = {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data,
                    url: error.config?.url,
                    method: error.config?.method,
                    campaignId,
                    naming,
                    targetCampaignId,
                };

                Logger.error(
                    `Failed to share naming "${naming}" to campaign ${targetCampaignId}: ${error.message || `Request failed with status code ${error.response.status}`}`,
                    JSON.stringify(errorDetails, null, 2),
                    "KeitaroService.shareNaming",
                );
            } else {
                Logger.error(
                    `Failed to share naming "${naming}" to campaign ${targetCampaignId}: ${error instanceof Error ? error.message : "Unknown error"}`,
                    error instanceof Error ? error.stack : undefined,
                    "KeitaroService.shareNaming",
                );
            }

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

    async getStreamById(streamId: number) {
        const url = this.buildUrl(`admin_api/v1/streams/${streamId}`);

        try {
            const response = await axios.get(url, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.handleKeitaroError(this.getStreamById.name, error);
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

            if (
                !template ||
                !Array.isArray(template) ||
                template.length === 0 ||
                !template[0] ||
                !template[0].id
            ) {
                throw new Error(
                    "Failed to clone campaign template. Invalid response from Keitaro API.",
                );
            }

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

            if (!campaign || !campaign.id) {
                throw new Error(
                    "Failed to update campaign. Invalid response from Keitaro API.",
                );
            }

            const streamsUrl = this.buildUrl(
                `admin_api/v1/campaigns/${campaign.id}/streams`,
            );
            const { data: stream } = await axios.get(streamsUrl, {
                headers: this.generateHeaders(),
            });
            const defaultStream = stream.find((s) => s.name === "Default");

            if (!defaultStream) {
                Logger.error(
                    "Default stream not found",
                    undefined,
                    "KeitaroService.createRentCampaign",
                );
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

        if (!keitaroDomain) {
            throw new Error(
                "Invalid URL: keitaroDomain is not configured. Please set KEITARO_DOMAIN or KEITARO_DOMAIN_DEV in .env",
            );
        }

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

    async ensureRequiredStreams(campaignId: number): Promise<any[]> {
        try {
            const streams = await this.getCampaignStreams(campaignId);
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
            const testFlowFilter = streams.find(
                (s) =>
                    s.name?.toLowerCase() ===
                    KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
            );

            const getNextPosition = () => {
                const maxPosition = streams.reduce(
                    (max, stream) => Math.max(max, stream.position || 0),
                    0,
                );
                return maxPosition + 1;
            };

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
                    position: getNextPosition(),
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
                            queryCheckerOfferId: this.configService.get(
                                "keitaro.testFlowOfferId",
                            ),
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

            if (!testFlowFilter) {
                const filterData = {
                    ...defaultStreamData,
                    name: KeitaroService.STREAM_NAMES.FILTER_TEST_FLOW,
                    schema: "action",
                    action_type: "do_nothing",
                    position: getNextPosition(),
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
                    position: getNextPosition(),
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
                    position: getNextPosition(),
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

            return createdStreams;
        } catch (error) {
            this.handleKeitaroError(this.ensureRequiredStreams.name, error);
        }
    }

    private async validateIntegrationInternal(
        campaignId: number,
        appId?: string,
    ): Promise<any> {
        try {
            const issues: any[] = [];
            const warnings: string[] = [];
            const fixed: any[] = [];

            Logger.debug(
                `[validateIntegrationInternal] Starting validation for campaign ${campaignId}`,
                { campaignId },
                "KeitaroService.validateIntegrationInternal",
            );

            // 1. Перевірка існування campaign в Keitaro
            let campaign;
            try {
                campaign = await this.getCampaignById(campaignId);
                if (!campaign) {
                    Logger.warn(
                        `Campaign ${campaignId} not found in Keitaro`,
                        { campaignId },
                        "KeitaroService.validateIntegrationInternal",
                    );
                    issues.push({
                        type: "campaign_not_found",
                        streamName: null,
                        message: `Campaign з ID ${campaignId} не знайдено в Keitaro`,
                    });
                    return {
                        valid: false,
                        warnings,
                        issues,
                        fixed,
                    };
                }
                Logger.debug(
                    `Campaign ${campaignId} found: ${campaign.name}`,
                    { campaignId, campaignName: campaign.name },
                    "KeitaroService.validateIntegrationInternal",
                );
            } catch (error: any) {
                if (error?.response?.status === 404) {
                    Logger.warn(
                        `Campaign ${campaignId} does not exist in Keitaro (404)`,
                        { campaignId },
                        "KeitaroService.validateIntegrationInternal",
                    );
                    issues.push({
                        type: "campaign_not_found",
                        streamName: null,
                        message: `Campaign з ID ${campaignId} не існує в Keitaro`,
                    });
                    return {
                        valid: false,
                        warnings,
                        issues,
                        fixed,
                    };
                }
                throw error;
            }

            // 2. Валідація Click API token
            if (!campaign.token || campaign.token.trim() === "") {
                Logger.warn(
                    `Campaign ${campaignId} has missing or empty Click API token`,
                    { campaignId },
                    "KeitaroService.validateIntegrationInternal",
                );
                issues.push({
                    type: "missing_click_api_token",
                    streamName: null,
                    message:
                        "Click API token відсутній або порожній в campaign",
                });
            } else {
                // Перевірка формату token (зазвичай це alphanumeric string)
                const tokenPattern = /^[A-Za-z0-9]+$/;
                if (!tokenPattern.test(campaign.token)) {
                    Logger.warn(
                        `Campaign ${campaignId} has non-standard token format`,
                        {
                            campaignId,
                            token: campaign.token.substring(0, 10) + "...",
                        },
                        "KeitaroService.validateIntegrationInternal",
                    );
                    warnings.push(
                        `Click API token має нестандартний формат: "${campaign.token}"`,
                    );
                } else {
                    Logger.debug(
                        `Campaign ${campaignId} has valid Click API token`,
                        { campaignId },
                        "KeitaroService.validateIntegrationInternal",
                    );
                }
            }

            // 3. Отримуємо streams для подальшої перевірки
            const streams = await this.getCampaignStreams(campaignId);
            Logger.debug(
                `Found ${streams.length} streams in campaign ${campaignId}`,
                { campaignId, streamsCount: streams.length },
                "KeitaroService.validateIntegrationInternal",
            );

            // 4. Перевірка GEO filters
            this.validateGeoFilters(streams, warnings);

            // 5. Перевірка default flow
            const defaultFlow = streams.find((s) => s.type === "default");
            this.validateDefaultFlow(defaultFlow, campaignId, issues);
            if (defaultFlow) {
                Logger.debug(
                    `Default flow found in campaign ${campaignId}`,
                    {
                        campaignId,
                        defaultFlowName: defaultFlow.name,
                        defaultFlowActionType: defaultFlow.action_type,
                        defaultFlowActionPayload: defaultFlow.action_payload,
                    },
                    "KeitaroService.validateIntegrationInternal",
                );
            } else {
                Logger.warn(
                    `Default flow not found in campaign ${campaignId}`,
                    { campaignId },
                    "KeitaroService.validateIntegrationInternal",
                );
            }

            // 6. Перевірка filter flows
            const filterFlows = streams.filter(
                (s) =>
                    s.name?.toLowerCase().startsWith("filter") &&
                    s.type === "forced",
            );
            Logger.debug(
                `Found ${filterFlows.length} filter flows in campaign ${campaignId}`,
                {
                    campaignId,
                    filterFlowsCount: filterFlows.length,
                    filterFlowNames: filterFlows.map((f) => f.name),
                },
                "KeitaroService.validateIntegrationInternal",
            );
            this.validateFilterFlows(filterFlows, issues);

            // 7. Перевірка всіх naming flows
            const namingFlows = streams.filter(
                (s) =>
                    s.name?.startsWith("Naming Share:") && s.type === "regular",
            );
            Logger.debug(
                `Found ${namingFlows.length} naming flows in campaign ${campaignId}`,
                {
                    campaignId,
                    namingFlowsCount: namingFlows.length,
                    namingFlowNames: namingFlows.map((n) => n.name),
                    namingFlowsDetails: namingFlows.map((n) => ({
                        name: n.name,
                        id: n.id,
                        action_type: n.action_type,
                        action_payload: n.action_payload,
                        state: n.state,
                        type: n.type,
                        hasSubId17: n.filters?.some(
                            (f) => f.name === "sub_id_17",
                        ),
                    })),
                },
                "KeitaroService.validateIntegrationInternal",
            );
            this.validateNamingFlows(namingFlows, campaignId, issues);

            // 7.1. Перевірка на видалені, змінені та зайві naming flows (якщо передано appId)
            if (appId) {
                await this.checkDeletedNamingFlows(
                    namingFlows,
                    appId,
                    warnings,
                    issues,
                );
            }

            // 8. Перевірка на зайві streams
            this.checkExtraStreams(streams, warnings);

            // Підрахунок статистики по типах issues
            const namingFlowIssues = issues.filter((i) =>
                i.streamName?.startsWith("Naming Share:"),
            );
            const otherIssues = issues.filter(
                (i) => !i.streamName?.startsWith("Naming Share:"),
            );

            const result = {
                valid: issues.length === 0,
                warnings,
                issues,
                fixed,
                // Додаткова статистика для деталізації
                statistics: {
                    totalIssues: issues.length,
                    namingFlowIssues: namingFlowIssues.length,
                    otherIssues: otherIssues.length,
                    totalWarnings: warnings.length,
                    totalFixed: fixed.length,
                },
            };

            Logger.info(
                `Validation completed for campaign ${campaignId}: valid=${result.valid}, issues=${result.issues.length} (naming flows: ${namingFlowIssues.length}, other: ${otherIssues.length}), warnings=${result.warnings.length}`,
                {
                    campaignId,
                    valid: result.valid,
                    issuesCount: result.issues.length,
                    namingFlowIssuesCount: namingFlowIssues.length,
                    otherIssuesCount: otherIssues.length,
                    warningsCount: result.warnings.length,
                    issues: result.issues.map((i) => ({
                        type: i.type,
                        streamName: i.streamName,
                        isNamingFlow: i.streamName?.startsWith("Naming Share:"),
                    })),
                },
                "KeitaroService.validateIntegrationInternal",
            );

            return result;
        } catch (error) {
            Logger.error(
                `Failed to validate integration for campaign ${campaignId}`,
                error instanceof Error ? error.stack : undefined,
                "KeitaroService.validateIntegrationInternal",
            );
            this.handleKeitaroError(
                this.validateIntegrationInternal.name,
                error,
            );
        }
    }

    async validateIntegration(
        campaignId: number,
        appId?: string,
    ): Promise<any> {
        return this.ensureAndValidateIntegration(campaignId, appId);
    }

    async ensureAndValidateIntegration(
        campaignId: number,
        appId?: string,
    ): Promise<any> {
        try {
            Logger.info(
                `Starting validateIntegration for campaign ${campaignId}`,
                { campaignId },
                "KeitaroService.ensureAndValidateIntegration",
            );

            // Автоматично створюємо missing required streams (test flow, deny all, deny org)
            // Примітка: default flow не створюється автоматично - він створюється при створенні campaign
            // або через окремий метод configureDefaultFlow
            const createdStreams = await this.ensureRequiredStreams(campaignId);

            Logger.info(
                `Created ${createdStreams.length} missing required streams for campaign ${campaignId}`,
                { campaignId, createdStreams },
                "KeitaroService.ensureAndValidateIntegration",
            );

            // Перевіряємо інтеграцію
            const validationResult = await this.validateIntegrationInternal(
                campaignId,
                appId,
            );

            // Формуємо fixed items (створені streams)
            const fixedFromCreatedStreams = createdStreams.map((stream) => ({
                type: "stream_created",
                streamName: stream.name,
                message: `Автоматично створено stream: "${stream.name}" (ID: ${stream.id})`,
                streamId: stream.id,
            }));

            // Об'єднуємо fixed з validationResult (якщо там щось є)
            const allFixed = [
                ...(validationResult.fixed || []),
                ...fixedFromCreatedStreams,
            ];

            const result = {
                ...validationResult,
                createdStreams,
                fixed: allFixed, // Об'єднаний масив fixed для відправки в телеграм
            };

            Logger.info(
                `Validation completed for campaign ${campaignId}: valid=${result.valid}, issues=${result.issues?.length || 0}, warnings=${result.warnings?.length || 0}, fixed=${result.fixed?.length || 0}`,
                {
                    campaignId,
                    valid: result.valid,
                    issuesCount: result.issues?.length || 0,
                    warningsCount: result.warnings?.length || 0,
                    fixedCount: result.fixed?.length || 0,
                },
                "KeitaroService.ensureAndValidateIntegration",
            );

            return result;
        } catch (error) {
            Logger.error(
                `Failed to validate integration for campaign ${campaignId}`,
                error instanceof Error ? error.stack : undefined,
                "KeitaroService.ensureAndValidateIntegration",
            );
            this.handleKeitaroError(
                this.ensureAndValidateIntegration.name,
                error,
            );
        }
    }

    private validateDefaultFlow(
        defaultFlow: any,
        campaignId: number,
        issues: any[],
    ): void {
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
    }

    private validateFilterFlows(filterFlows: any[], issues: any[]): void {
        for (const filterFlow of filterFlows) {
            if (!filterFlow.filters || filterFlow.filters.length === 0) {
                issues.push({
                    type: "incorrect_config",
                    streamName: filterFlow.name,
                    message: "Filter потік має містити фільтри",
                });
            }
            if (
                !filterFlow.action_type ||
                filterFlow.action_type !== "do_nothing"
            ) {
                issues.push({
                    type: "incorrect_config",
                    streamName: filterFlow.name,
                    message:
                        "Filter потік має містити action_type 'do_nothing'",
                });
            }
        }
    }

    private validateNamingFlows(
        namingFlows: any[],
        appCampaignId: number,
        issues: any[],
    ): void {
        Logger.debug(
            `Validating ${namingFlows.length} naming flows for campaign ${appCampaignId}`,
            {
                appCampaignId,
                namingFlowsCount: namingFlows.length,
            },
            "KeitaroService.validateNamingFlows",
        );

        for (const namingFlow of namingFlows) {
            const namingName =
                namingFlow.name?.replace("Naming Share: ", "") || "unknown";
            const streamId = namingFlow.id;
            const issuesForThisFlow: any[] = [];

            Logger.debug(
                `Validating naming flow: "${namingFlow.name}" (ID: ${streamId})`,
                {
                    streamId,
                    streamName: namingFlow.name,
                    namingName,
                    action_type: namingFlow.action_type,
                    action_payload: namingFlow.action_payload,
                    state: namingFlow.state,
                    type: namingFlow.type,
                    filtersCount: namingFlow.filters?.length || 0,
                },
                "KeitaroService.validateNamingFlows",
            );

            // Перевірка action_type
            if (namingFlow.action_type !== "campaign") {
                issuesForThisFlow.push({
                    type: "incorrect_config",
                    streamName: namingFlow.name,
                    streamId: streamId,
                    field: "action_type",
                    expected: "campaign",
                    actual: namingFlow.action_type,
                    message: `Naming потік "${namingName}" має мати action_type 'campaign', але має: "${namingFlow.action_type}"`,
                });
            }

            // Перевірка наявності фільтра sub_id_17
            const hasSubId17Filter = namingFlow.filters?.some(
                (f) => f.name === "sub_id_17",
            );
            if (!hasSubId17Filter) {
                issuesForThisFlow.push({
                    type: "missing_filter",
                    streamName: namingFlow.name,
                    streamId: streamId,
                    field: "filters",
                    missingFilter: "sub_id_17",
                    message: `Naming потік "${namingName}" має містити фільтр sub_id_17 для коректної роботи`,
                });
            }

            // Перевірка state
            if (namingFlow.state !== "active") {
                issuesForThisFlow.push({
                    type: "incorrect_state",
                    streamName: namingFlow.name,
                    streamId: streamId,
                    field: "state",
                    expected: "active",
                    actual: namingFlow.state,
                    message: `Naming потік "${namingName}" має бути активним, але має state: "${namingFlow.state}"`,
                });
            }

            // Перевірка type
            if (namingFlow.type !== "regular") {
                issuesForThisFlow.push({
                    type: "incorrect_config",
                    streamName: namingFlow.name,
                    streamId: streamId,
                    field: "type",
                    expected: "regular",
                    actual: namingFlow.type,
                    message: `Naming потік "${namingName}" має мати type "regular", але має: "${namingFlow.type}"`,
                });
            }

            // Перевірка action_payload (має бути встановлено)
            if (
                !namingFlow.action_payload ||
                namingFlow.action_payload === ""
            ) {
                issuesForThisFlow.push({
                    type: "missing_action_payload",
                    streamName: namingFlow.name,
                    streamId: streamId,
                    field: "action_payload",
                    message: `Naming потік "${namingName}" має містити action_payload (target campaign ID) для редиректу`,
                });
            } else {
                // Перевірка, чи action_payload не вказує на саму APP campaign (self-redirect)
                const targetCampaignId = parseInt(
                    namingFlow.action_payload,
                    10,
                );
                if (targetCampaignId === appCampaignId) {
                    issuesForThisFlow.push({
                        type: "self_redirect",
                        streamName: namingFlow.name,
                        streamId: streamId,
                        field: "action_payload",
                        actual: namingFlow.action_payload,
                        message: `Naming потік "${namingName}" налаштований на self-redirect (перенаправляє на саму APP campaign ${appCampaignId}). Має перенаправляти на ORG campaign`,
                    });
                } else if (!isNaN(targetCampaignId)) {
                    Logger.debug(
                        `Naming flow "${namingName}" redirects to campaign ${targetCampaignId} (correct, not self-redirect)`,
                        {
                            streamId,
                            namingName,
                            appCampaignId,
                            targetCampaignId,
                        },
                        "KeitaroService.validateNamingFlows",
                    );
                }
            }

            // Додаємо всі issues для цього naming flow
            if (issuesForThisFlow.length > 0) {
                Logger.warn(
                    `Found ${issuesForThisFlow.length} issue(s) in naming flow "${namingName}" (ID: ${streamId})`,
                    {
                        streamId,
                        namingName,
                        streamName: namingFlow.name,
                        issuesCount: issuesForThisFlow.length,
                        issues: issuesForThisFlow.map((i) => i.type),
                    },
                    "KeitaroService.validateNamingFlows",
                );
                issues.push(...issuesForThisFlow);
            } else {
                Logger.debug(
                    `Naming flow "${namingName}" (ID: ${streamId}) is valid`,
                    {
                        streamId,
                        namingName,
                        streamName: namingFlow.name,
                    },
                    "KeitaroService.validateNamingFlows",
                );
            }
        }

        Logger.info(
            `Naming flows validation completed: ${namingFlows.length} flows checked, ${issues.filter((i) => i.streamName?.startsWith("Naming Share:")).length} issues found`,
            {
                appCampaignId,
                totalNamingFlows: namingFlows.length,
                issuesCount: issues.filter((i) =>
                    i.streamName?.startsWith("Naming Share:"),
                ).length,
            },
            "KeitaroService.validateNamingFlows",
        );
    }

    /**
     * Перевіряє naming flows на видалення, зміни та інші проблеми з точки зору бізнес-логіки
     * - Видалені naming flows (є в системі, але відсутні в Keitaro)
     * - Змінені naming flows (action_payload, state, filters, тощо)
     * - Зайві naming flows (є в Keitaro, але не очікуються)
     */
    private async checkDeletedNamingFlows(
        namingFlows: any[],
        appId: string,
        warnings: string[],
        issues: any[],
    ): Promise<void> {
        try {
            // Отримуємо namings з CRM API
            const crmApiUrl =
                this.configService.get<string>("crmApiUrl") ||
                "http://localhost:5000";
            const namingsUrl = `${crmApiUrl}/api/keitaro/namings-for-app/${appId}`;

            Logger.debug(
                `Fetching expected namings for app ${appId} from CRM API`,
                { appId, namingsUrl },
                "KeitaroService.checkDeletedNamingFlows",
            );

            let expectedNamings: Array<{
                namingKey: string;
                targetCampaignId: number;
                keitaroCampaign: number | null;
            }> = [];

            try {
                const response = await axios.get(namingsUrl, {
                    timeout: 10000,
                });
                if (response.data && Array.isArray(response.data)) {
                    expectedNamings = response.data.map((n: any) => ({
                        namingKey: n.namingKey || n.naming || n,
                        targetCampaignId: n.targetCampaignId,
                        keitaroCampaign: n.keitaroCampaign || null,
                    }));
                }
            } catch (error: any) {
                // Якщо не вдалося отримати namings - просто логуємо і продовжуємо
                Logger.warn(
                    `Failed to fetch expected namings for app ${appId}: ${error?.message || "Unknown error"}`,
                    { appId, error: error?.message },
                    "KeitaroService.checkDeletedNamingFlows",
                );
                return; // Не додаємо warnings, якщо не вдалося отримати дані
            }

            if (expectedNamings.length === 0) {
                Logger.debug(
                    `No expected namings found for app ${appId}`,
                    { appId },
                    "KeitaroService.checkDeletedNamingFlows",
                );
                // Перевіряємо зайві naming flows (які є в Keitaro, але не очікуються)
                this.checkExtraNamingFlows(
                    namingFlows,
                    new Set<string>(),
                    warnings,
                );
                return;
            }

            // Створюємо Map для швидкого пошуку naming flows в Keitaro
            const keitaroNamingMap = new Map<string, any>();
            namingFlows.forEach((flow) => {
                const namingName = flow.name
                    ?.replace("Naming Share: ", "")
                    .trim();
                if (namingName) {
                    keitaroNamingMap.set(namingName, flow);
                }
            });

            // Створюємо Set з очікуваних naming names
            const expectedNamingNames = new Set(
                expectedNamings.map((n) => n.namingKey),
            );

            // 1. Перевірка на видалені naming flows
            const deletedNamings = expectedNamings.filter(
                (naming) => !keitaroNamingMap.has(naming.namingKey),
            );

            if (deletedNamings.length > 0) {
                Logger.warn(
                    `Found ${deletedNamings.length} naming(s) that exist in our system but are deleted in Keitaro`,
                    {
                        appId,
                        deletedNamings: deletedNamings.map((n) => n.namingKey),
                        totalExpected: expectedNamings.length,
                        totalInKeitaro: namingFlows.length,
                    },
                    "KeitaroService.checkDeletedNamingFlows",
                );

                issues.push({
                    type: "deleted_naming_flow",
                    streamName: null,
                    message: `Знайдено ${deletedNamings.length} naming(s), які є в нашій системі, але видалені в Keitaro: ${deletedNamings.map((n) => n.namingKey).join(", ")}. Потрібно повторно поділитися naming через "Поширити неймінги в Keitaro".`,
                    deletedNamings: deletedNamings.map((n) => n.namingKey),
                });
            }

            // 2. Перевірка на змінені naming flows
            for (const expectedNaming of expectedNamings) {
                const keitaroFlow = keitaroNamingMap.get(
                    expectedNaming.namingKey,
                );
                if (!keitaroFlow) {
                    continue; // Вже оброблено як видалений
                }

                const changes: string[] = [];

                // Перевірка action_payload (target campaign ID)
                const expectedTargetCampaignId = String(
                    expectedNaming.targetCampaignId,
                );
                const actualTargetCampaignId = String(
                    keitaroFlow.action_payload || "",
                );
                if (expectedTargetCampaignId !== actualTargetCampaignId) {
                    changes.push(
                        `action_payload змінено: очікується ${expectedTargetCampaignId}, фактично ${actualTargetCampaignId}`,
                    );
                }

                // Перевірка state (має бути active)
                if (keitaroFlow.state !== "active") {
                    changes.push(
                        `state змінено: очікується "active", фактично "${keitaroFlow.state}"`,
                    );
                }

                // Перевірка наявності фільтра sub_id_17
                const hasSubId17Filter = keitaroFlow.filters?.some(
                    (f: any) => f.name === "sub_id_17",
                );
                if (!hasSubId17Filter) {
                    changes.push(`фільтр sub_id_17 видалено`);
                }

                // Перевірка action_type
                if (keitaroFlow.action_type !== "campaign") {
                    changes.push(
                        `action_type змінено: очікується "campaign", фактично "${keitaroFlow.action_type}"`,
                    );
                }

                // Перевірка type
                if (keitaroFlow.type !== "regular") {
                    changes.push(
                        `type змінено: очікується "regular", фактично "${keitaroFlow.type}"`,
                    );
                }

                if (changes.length > 0) {
                    Logger.warn(
                        `Found changes in naming flow "${expectedNaming.namingKey}"`,
                        {
                            appId,
                            namingKey: expectedNaming.namingKey,
                            streamId: keitaroFlow.id,
                            changes,
                        },
                        "KeitaroService.checkDeletedNamingFlows",
                    );

                    issues.push({
                        type: "modified_naming_flow",
                        streamName: keitaroFlow.name,
                        streamId: keitaroFlow.id,
                        message: `Naming flow "${expectedNaming.namingKey}" було змінено в Keitaro: ${changes.join("; ")}. Потрібно повторно поділитися naming через "Поширити неймінги в Keitaro".`,
                        changes,
                        expectedTargetCampaignId,
                        actualTargetCampaignId,
                    });
                }
            }

            // 3. Перевірка на зайві naming flows (є в Keitaro, але не очікуються)
            if (expectedNamingNames) {
                this.checkExtraNamingFlows(
                    namingFlows,
                    expectedNamingNames,
                    warnings,
                );
            }

            Logger.info(
                `Naming flows validation completed: ${expectedNamings.length} expected, ${namingFlows.length} in Keitaro, ${deletedNamings.length} deleted, ${issues.filter((i) => i.type === "modified_naming_flow").length} modified`,
                {
                    appId,
                    totalExpected: expectedNamings.length,
                    totalInKeitaro: namingFlows.length,
                    deletedCount: deletedNamings.length,
                    modifiedCount: issues.filter(
                        (i) => i.type === "modified_naming_flow",
                    ).length,
                },
                "KeitaroService.checkDeletedNamingFlows",
            );
        } catch (error) {
            Logger.error(
                `Error checking naming flows for app ${appId}`,
                error instanceof Error ? error.stack : undefined,
                "KeitaroService.checkDeletedNamingFlows",
            );
            // Не кидаємо помилку - просто логуємо
        }
    }

    /**
     * Перевіряє на зайві naming flows (є в Keitaro, але не очікуються в нашій системі)
     */
    private checkExtraNamingFlows(
        namingFlows: any[],
        expectedNamingNames?: Set<string>,
        warnings?: string[],
    ): void {
        if (!expectedNamingNames || !warnings) {
            return;
        }

        const extraNamingFlows = namingFlows.filter((flow) => {
            const namingName = flow.name?.replace("Naming Share: ", "").trim();
            return namingName && !expectedNamingNames.has(namingName);
        });

        if (extraNamingFlows.length > 0) {
            const extraNames = extraNamingFlows.map((flow) =>
                flow.name?.replace("Naming Share: ", "").trim(),
            );
            Logger.warn(
                `Found ${extraNamingFlows.length} extra naming flow(s) in Keitaro that are not expected in our system`,
                {
                    extraNames,
                    totalInKeitaro: namingFlows.length,
                    totalExpected: expectedNamingNames.size,
                },
                "KeitaroService.checkExtraNamingFlows",
            );

            warnings.push(
                `Знайдено ${extraNamingFlows.length} naming flow(s) в Keitaro, які не очікуються в нашій системі: ${extraNames.join(", ")}. Можливо, вони були створені вручну або належать іншій апці.`,
            );
        }
    }

    private checkExtraStreams(streams: any[], warnings: string[]): void {
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
    }

    /**
     * Перевіряє GEO filters в streams
     * Видає warnings для розбіжностей (наприклад, якщо є GEO filters, які не очікуються)
     */
    private validateGeoFilters(streams: any[], warnings: string[]): void {
        const geoStreams = streams.filter((s) => {
            const hasGeoFilter = s.filters?.some(
                (f) => f.name === "country" || f.name === "geo",
            );
            return hasGeoFilter && s.type === "forced";
        });

        if (geoStreams.length > 0) {
            // Перевіряємо, чи GEO filters мають правильну конфігурацію
            for (const geoStream of geoStreams) {
                const geoFilters = geoStream.filters?.filter(
                    (f) => f.name === "country" || f.name === "geo",
                );

                if (geoFilters && geoFilters.length > 0) {
                    for (const geoFilter of geoFilters) {
                        // Перевірка на порожні payload
                        if (
                            !geoFilter.payload ||
                            (Array.isArray(geoFilter.payload) &&
                                geoFilter.payload.length === 0)
                        ) {
                            warnings.push(
                                `Stream "${geoStream.name}" має GEO filter з порожнім payload`,
                            );
                        }

                        // Перевірка на невалідні коди країн (якщо payload - масив)
                        if (Array.isArray(geoFilter.payload)) {
                            const invalidCodes = geoFilter.payload.filter(
                                (code) =>
                                    typeof code !== "string" ||
                                    code.length !== 2,
                            );
                            if (invalidCodes.length > 0) {
                                warnings.push(
                                    `Stream "${geoStream.name}" має GEO filter з невалідними кодами країн: ${invalidCodes.join(", ")}`,
                                );
                            }
                        }
                    }
                }
            }

            // Якщо є GEO filters, але немає явних проблем - просто інформуємо
            if (geoStreams.length > 0) {
                warnings.push(
                    `Знайдено ${geoStreams.length} stream(s) з GEO filters. Перевірте, чи вони відповідають очікуваним налаштуванням.`,
                );
            }
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

    // Failover methods
    async getCampaignsWithPagination(
        page: number = 1,
        limit: number = 100,
    ): Promise<Campaign[]> {
        return withRetry(
            async () => {
                const url = this.buildUrl("admin_api/v1/campaigns");
                const offset = (page - 1) * limit;
                const response = await axios.get(url, {
                    headers: this.generateHeaders(),
                    params: { offset, limit },
                });
                Logger.debug(
                    `Fetched ${response.data.length} campaigns from page ${page} (offset: ${offset})`,
                    "KeitaroService",
                );
                return response.data;
            },
            {
                maxAttempts: 3,
                delay: 1000,
                onRetry: (attempt) =>
                    Logger.warn(
                        `Retrying getCampaignsWithPagination, attempt ${attempt}`,
                        "KeitaroService",
                    ),
            },
        );
    }

    async getAllCampaignsFromMinId(
        appId: string,
        campaignGroupId: number,
        minCampaignId: number,
        pageSize: number = 100,
    ): Promise<Campaign[]> {
        const allCampaigns: Campaign[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const campaigns = await this.getCampaignsWithPagination(
                page,
                pageSize,
            );

            if (!campaigns || campaigns.length === 0) {
                hasMore = false;
                break;
            }

            const filteredCampaigns = campaigns.filter(
                (c) =>
                    c.id >= minCampaignId &&
                    c.group_id === campaignGroupId &&
                    c.name.includes(appId),
            );

            allCampaigns.push(...filteredCampaigns);

            const minIdInPage = Math.min(...campaigns.map((c) => c.id));
            if (minIdInPage < minCampaignId) {
                hasMore = false;
            }

            page++;
        }

        Logger.info(
            `Found ${allCampaigns.length} matching campaigns for app_id: ${appId}`,
            "KeitaroService",
        );
        return allCampaigns;
    }

    async updateDomain(id: number, data: Partial<Domain>): Promise<Domain> {
        return withRetry(
            async () => {
                const url = this.buildUrl(`admin_api/v1/domains/${id}`);
                const response = await axios.put(url, data, {
                    headers: this.generateHeaders(),
                });
                Logger.debug(`Updated domain ${id}`, "KeitaroService");
                return response.data;
            },
            {
                maxAttempts: 3,
                delay: 1000,
                onRetry: (attempt) =>
                    Logger.warn(
                        `Retrying updateDomain ${id}, attempt ${attempt}`,
                        "KeitaroService",
                    ),
            },
        );
    }

    async getStream(campaignId: number, streamId: number): Promise<Stream> {
        return withRetry(
            async () => {
                const url = this.buildUrl(
                    `admin_api/v1/campaigns/${campaignId}/streams`,
                );
                const response = await axios.get(url, {
                    headers: this.generateHeaders(),
                });
                const streams = response.data;

                const stream = streams.find((s: Stream) => s.id === streamId);

                if (!stream) {
                    throw new Error(
                        `Stream ${streamId} not found in campaign ${campaignId}`,
                    );
                }

                Logger.debug(
                    `Fetched stream ${streamId} from campaign ${campaignId}`,
                    "KeitaroService",
                );
                return stream;
            },
            {
                maxAttempts: 3,
                delay: 1000,
                onRetry: (attempt) =>
                    Logger.warn(
                        `Retrying getStream ${streamId}, attempt ${attempt}`,
                        "KeitaroService",
                    ),
            },
        );
    }

    async updateStreamById(
        streamId: number,
        data: Partial<Stream>,
    ): Promise<Stream> {
        return withRetry(
            async () => {
                const url = this.buildUrl(`admin_api/v1/streams/${streamId}`);
                const response = await axios.put(url, data, {
                    headers: this.generateHeaders(),
                });
                Logger.debug(`Updated stream ${streamId}`, "KeitaroService");
                return response.data;
            },
            {
                maxAttempts: 3,
                delay: 1000,
                onRetry: (attempt) =>
                    Logger.warn(
                        `Retrying updateStreamById ${streamId}, attempt ${attempt}`,
                        "KeitaroService",
                    ),
            },
        );
    }

    async getReport(payload: ReportPayload): Promise<ReportResponse> {
        return withRetry(
            async () => {
                const url = this.buildUrl("admin_api/v1/report/build");
                const response = await axios.post(url, payload, {
                    headers: this.generateHeaders(),
                });
                Logger.debug(
                    `Generated report with ${response.data.rows?.length || 0} rows`,
                    "KeitaroService",
                );
                return response.data;
            },
            {
                maxAttempts: 3,
                delay: 1000,
                onRetry: (attempt) =>
                    Logger.warn(
                        `Retrying getReport, attempt ${attempt}`,
                        "KeitaroService",
                    ),
            },
        );
    }
}
