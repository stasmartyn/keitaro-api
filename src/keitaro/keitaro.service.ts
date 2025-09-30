import { Injectable } from "@nestjs/common";
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
    constructor(private readonly configService: ConfigService) {}

    async getOffers() {
        const url = this.buildUrl("admin_api/v1/offers");
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getAllCampaigns() {
        const url = this.buildUrl("admin_api/v1/campaigns");
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getCampaignById(campaignId: number) {
        const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getTrafficSourceById(trafficSourceId: number) {
        const url = this.buildUrl(
            `admin_api/v1/traffic_sources/${trafficSourceId}`,
        );
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getGroupById(groupId: number) {
        const url = this.buildUrl(`admin_api/v1/groups/${groupId}`);
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
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
            this.logAxiosError("getCampaignWithRelatedData", error, {
                campaignId,
            });
            throw error;
        }
    }

    async getAffiliateNetworks() {
        const url = this.buildUrl("admin_api/v1/affiliate_networks");
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async createAffiliateNetwork(affiliateNetworkBody: any) {
        const url = this.buildUrl("admin_api/v1/affiliate_networks");
        const response = await axios.post(url, affiliateNetworkBody, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async createOffer(offerParams: any) {
        const url = this.buildUrl("admin_api/v1/offers");
        const response = await axios.post(url, offerParams, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getOfferById(offerId: number) {
        const url = this.buildUrl(`admin_api/v1/offers/${offerId}`);
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async updateOffer(offerId: number, offerParams: any) {
        const url = this.buildUrl(`admin_api/v1/offers/${offerId}`);
        const response = await axios.put(url, offerParams, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async deleteOffer(offerId: number) {
        const url = this.buildUrl(`admin_api/v1/offers/${offerId}/archive`);

        try {
            const response = await axios.delete(url, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async deleteCampaign(campaignId: string) {
        return this.deleteResource(
            "admin_api/v1/campaigns",
            Number(campaignId),
        );
    }

    async deleteTrafficSource(trafficSourceId: string) {
        return this.deleteResource(
            "admin_api/v1/traffic_sources",
            Number(trafficSourceId),
        );
    }

    async deleteAffiliateNetwork(affiliateNetworkId: number) {
        const url = this.buildUrl(
            `admin_api/v1/affiliate_networks/${affiliateNetworkId}`,
        );

        try {
            const response = await axios.delete(url, {
                headers: this.generateHeaders(),
            });
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    async getAffiliateNetworkById(id: number) {
        const url = this.buildUrl(`admin_api/v1/affiliate_networks/${id}`);
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async createDomain(domain: string, groupId: number, oneLinkSettings: any) {
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
    }

    async getGroups(type: string) {
        const url = this.buildUrl("admin_api/v1/groups");
        const response = await axios.get(url, {
            params: {
                type,
            },
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async getDomains() {
        const url = this.buildUrl("admin_api/v1/domains");
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async checkDomainExists(domainName: string): Promise<boolean> {
        try {
            const domains = await this.getDomains();
            return domains.some((domain: any) => domain.name === domainName);
        } catch (error) {
            Logger.error(
                `Failed to check domain existence for ${domainName}:`,
                error,
            );
            return false;
        }
    }

    async getDomainById(domainId: number) {
        const url = this.buildUrl(`admin_api/v1/domains/${domainId}`);
        const response = await axios.get(url, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async deleteDomain(domainId: number) {
        return this.deleteResource("admin_api/v1/domains", domainId);
    }

    async createTrafficSource(
        name: string,
        sub_id: string = null,
        postback_url: string,
    ) {
        const url = this.buildUrl("admin_api/v1/traffic_sources");
        const params = trafficSourceParams(name, sub_id, postback_url);
        const response = await axios.post(url, params, {
            headers: this.generateHeaders(),
        });

        return response.data;
    }

    async createCampaign(data: CreateCampaignInterface) {
        const url = this.buildUrl("admin_api/v1/campaigns");
        const campaignPayload = campaignParams(data);

        const response = await axios.post(url, campaignPayload, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async createCLOCampaignStreams(
        campaignId: number,
        isAndroid: boolean,
        isIos: boolean,
    ) {
        const falseFilters = this.buildFalseFilters(isIos);
        const streamsData = streamParams(isAndroid, falseFilters);

        return await this.createStreamsAndExtractIds(campaignId, streamsData, {
            true: "clTrueId",
            false: "clFalseId",
        });
    }

    async createORGCampaignStreams(campaignId: number, isIos: boolean) {
        const falseFilters = this.buildFalseFilters(isIos);
        const streamsData = orgStreamParams(isIos, falseFilters);

        return await this.createStreamsAndExtractIds(campaignId, streamsData, {
            false: "orgFalseId",
        });
    }

    async createNoORGCampaignStreams(campaignId: number, isIos: boolean) {
        const streamsData = noOrgStreamParams(isIos);

        return await this.createStreamsAndExtractIds(campaignId, streamsData, {
            false: "noOrgFalseId",
        });
    }

    async deleteResource(path: string, id: number) {
        const url = this.buildUrl(`${path}/${id}`);
        const response = await axios.delete(url, {
            headers: this.generateHeaders(),
        });

        return response.data;
    }

    async copyCampaign(templateId: number) {
        const url = this.buildUrl(`admin_api/v1/campaigns/${templateId}/clone`);

        try {
            const response = await axios.post(
                url,
                {},
                {
                    headers: this.generateHeaders(),
                },
            );

            return response.data;
        } catch (error) {
            this.logAxiosError("copyCampaign", error, { templateId });
            throw error;
        }
    }

    async updateCampaign(campaignId: number, updateData: any) {
        try {
            const updates: any[] = [];

            if (updateData.keitaroCloCampId) {
                updates.push(
                    this.createCampaignUpdate(
                        updateData.keitaroCloCampId,
                        updateData.keitaroCloToken,
                        "keitaro_clo_campaign_id",
                        "keitaro_clo_token",
                    ),
                );
            }

            if (updateData.keitaroOrgCampId) {
                updates.push(
                    this.createCampaignUpdate(
                        updateData.keitaroOrgCampId,
                        updateData.keitaroOrgToken,
                        "keitaro_org_campaign_id",
                        "keitaro_org_token",
                    ),
                );
            }

            if (updateData.keitaroSourceId) {
                updates.push(
                    this.createSourceUpdate(
                        updateData.keitaroSourceId,
                        "keitaro_source_id",
                    ),
                );
            }

            const results = await Promise.allSettled(
                updates.map(async (update) => {
                    if (update.campaignId) {
                        return this.updateCampaign(
                            update.campaignId,
                            update.data,
                        );
                    } else if (update.sourceId) {
                        return this.updateTrafficSource(
                            update.sourceId,
                            update.data,
                        );
                    }
                }),
            );

            return {
                success: true,
                updates: results.map((result, index) => ({
                    id: updates[index].campaignId || updates[index].sourceId,
                    type: updates[index].campaignId
                        ? "campaign"
                        : "traffic_source",
                    success: result.status === "fulfilled",
                    data: result.status === "fulfilled" ? result.value : null,
                    error: result.status === "rejected" ? result.reason : null,
                })),
            };
        } catch (error) {
            this.logAxiosError("updateCampaign", error, {
                updateData,
            });
            throw error;
        }
    }

    async updateTrafficSource(sourceId: number, updateData: any) {
        const url = this.buildUrl(`admin_api/v1/traffic_sources/${sourceId}`);

        try {
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.logAxiosError("updateTrafficSource", error, {
                sourceId,
                updateData,
            });
            throw error;
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
            this.logAxiosError("syncAppWithKeitaro", error, { appData });
            throw error;
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
            this.logAxiosError("syncNamingStreams", error, {
                campaignId,
                namingStreams,
            });
        }

        return updates;
    }

    private async updateStream(
        streamId: number,
        updateData: any,
    ): Promise<any> {
        const url = this.buildUrl(`admin_api/v1/streams/${streamId}`);
        const response = await axios.put(url, updateData, {
            headers: this.generateHeaders(),
        });
        return response.data;
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

            const denyAllStream = streams.find((stream: any) =>
                stream.name.toLowerCase().includes("deny all traffic"),
            );

            if (!denyAllStream) {
                throw new Error("Deny all traffic stream not found");
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
            this.logAxiosError("closeCloak", error, { campaignId });
            throw error;
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
            this.logAxiosError("closeGeo", error, { campaignId, geoCode });
            throw error;
        }
    }

    async shareNaming(
        campaignId: number,
        naming: string,
        targetCampaignId: number,
    ): Promise<any> {
        try {
            const streamData = {
                campaign_id: campaignId,
                name: `Naming Share: ${naming}`,
                type: "regular",
                position: 1,
                state: "active",
                weight: 100,
                action_type: "campaign",
                action_payload: targetCampaignId.toString(),
                schema: "landings",
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
            this.logAxiosError("shareNaming", error, {
                campaignId,
                naming,
                targetCampaignId,
            });
            throw error;
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
            this.logAxiosError("getCampaignStreams", error, { campaignId });
            throw error;
        }
    }

    async updateNoOrgCampaignPostback(updateData: any, campaignId: number) {
        const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);
        const response = await axios.put(url, updateData, {
            headers: this.generateHeaders(),
        });
        return response.data;
    }

    async createStream(campaignId: number, streamData: any) {
        const url = this.buildUrl("admin_api/v1/streams");
        const params = {
            campaign_id: campaignId,
            ...streamData,
        };
        const response = await axios.post(url, params, {
            headers: this.generateHeaders(),
        });

        return response.data;
    }

    async createGroup(name: string, type: string) {
        const url = this.buildUrl("admin_api/v1/groups");
        const response = await axios.post(
            url,
            { name, type },
            {
                headers: this.generateHeaders(),
            },
        );
        return response.data;
    }

    async createRentOffer(offerParams: Record<string, any>) {
        const url = this.buildUrl("admin_api/v1/offers");
        const response = await axios.post(url, offerParams, {
            headers: this.generateHeaders(),
        });

        return response.data;
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
            console.error(
                "Failed to create rent campaign:",
                error?.response?.data || error,
            );
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
        return {
            "Api-Key": this.configService.get("keitaro.apiKey"),
            "Content-Type": "application/json",
        };
    }

    private logAxiosError(
        methodName: string,
        error: any,
        additionalData?: any,
    ) {
        Logger.error(
            `${methodName} failed`,
            {
                ...additionalData,
                axiosRequest: {
                    url: error.config?.url,
                    method: error.config?.method?.toUpperCase(),
                    headers: error.config?.headers,
                    data: error.config?.data,
                    params: error.config?.params,
                },
                axiosResponse: {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    headers: error.response?.headers,
                },
            },
            "KeitaroService",
        );
    }
}
