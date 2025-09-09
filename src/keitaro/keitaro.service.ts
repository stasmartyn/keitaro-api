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
        const url = this.buildUrl(`admin_api/v1/campaigns/${campaignId}`);

        try {
            const response = await axios.put(url, updateData, {
                headers: this.generateHeaders(),
            });

            return response.data;
        } catch (error) {
            this.logAxiosError("updateCampaign", error, {
                campaignId,
                updateData,
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
