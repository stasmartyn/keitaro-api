import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { KeitaroService } from "../../keitaro/keitaro.service";
import { wrapWithErrorHandler } from "../../utils/error-wrapper";
import { Logger } from "../../utils/logger";
import { CreateAppDto } from "../dto/create-app.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";

@Injectable()
export class AppsV2Service {
    constructor(
        private readonly keitaroClient: KeitaroService,
        private readonly configService: ConfigService,
    ) {}

    async createApp(body: CreateAppDto) {
        const createAppWithErrorHandler = wrapWithErrorHandler(
            this.createAppInternal.bind(this),
            {
                functionName: "AppsV2Service.createApp",
                additionalData: {
                    endpoint: "POST /v2/apps/create-campaign",
                    version: "v2",
                },
            },
        );

        return createAppWithErrorHandler(body);
    }

    async createCloApp(body: CreateAppDto) {
        const createAppWithErrorHandler = wrapWithErrorHandler(
            this.createCloAppInternal.bind(this),
            {
                functionName: "AppsV2Service.createCloApp",
                additionalData: {
                    endpoint: "POST /v2/apps/create-clo-campaign",
                    version: "v2",
                },
            },
        );

        return createAppWithErrorHandler(body);
    }

    private async createAppInternal(body: CreateAppDto) {
        const results: Record<string, { res: any; path: string }> = {};
        try {
            const {
                name,
                bundle_id,
                sub_id,
                postback_url,
                isIos,
                campaign_id,
            } = body;

            if (!name || !bundle_id) {
                throw new BadRequestException("Missing required fields.");
            }

            const result: CreateAppResultInterface = {
                trafficSourceId: null,
                orgCampaign: {
                    campaignId: null,
                    campaignToken: null,
                    campaignAlias: null,
                    orgFalseId: null,
                },
                cloCampaign: {
                    campaignId: null,
                    campaignToken: null,
                    campaignAlias: null,
                    clTrueId: null,
                    clFalseId: null,
                },
            };

            const cloCampaignTemplateId = campaign_id
                ? Number(campaign_id)
                : isIos
                  ? this.configService.get<number>(
                        "keitaro.iosCloCampaignTemplateId",
                    )
                  : this.configService.get<number>(
                        "keitaro.androidCloCampaignTemplateId",
                    );

            if (!cloCampaignTemplateId || isNaN(cloCampaignTemplateId)) {
                throw new BadRequestException(
                    `Template ID not found. Please provide campaign_id or configure keitaro.${isIos ? "ios" : "android"}CloCampaignTemplateId`,
                );
            }

            const orgCampaignTemplateId = campaign_id
                ? Number(campaign_id)
                : isIos
                  ? this.configService.get<number>(
                        "keitaro.iosOrgCampaignTemplateId",
                    )
                  : this.configService.get<number>(
                        "keitaro.androidOrgCampaignTemplateId",
                    );

            if (!orgCampaignTemplateId || isNaN(orgCampaignTemplateId)) {
                throw new BadRequestException(
                    `Template ID not found. Please provide campaign_id or configure keitaro.${isIos ? "ios" : "android"}OrgCampaignTemplateId`,
                );
            }

            const steps = [
                {
                    key: "trafficSource",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.createTrafficSource(
                                `${bundle_id} (${name})`,
                                sub_id,
                                postback_url,
                            );
                        result.trafficSourceId = res.id;
                        return res;
                    },
                    path: "admin_api/v1/traffic_sources",
                },
                {
                    key: "copyCLOCampaign",
                    fn: async () => {
                        const res = await this.keitaroClient.copyCampaign(
                            cloCampaignTemplateId,
                        );

                        const campaign = Array.isArray(res) ? res[0] : res;

                        if (!campaign || !campaign.id) {
                            throw new BadRequestException(
                                `Failed to copy campaign: invalid response from API. Response: ${JSON.stringify(res)}`,
                            );
                        }

                        result.cloCampaign = {
                            campaignId: campaign.id,
                            campaignToken: `${campaign.token}`,
                            campaignAlias: `${campaign.alias}`,
                            clTrueId: null,
                            clFalseId: null,
                        };
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${cloCampaignTemplateId}/clone`,
                },
                {
                    key: "getCLOCampaignFalseStreamId",
                    fn: async () => {
                        const res = await this.keitaroClient.getCampaignStreams(
                            result.cloCampaign.campaignId,
                        );

                        const clFalseStream = res.find(
                            (stream) => stream.name === "false",
                        );
                        result.cloCampaign.clFalseId =
                            clFalseStream?.id || null;
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${result.cloCampaign.campaignId}/streams`,
                },
                {
                    key: "updateCLOCampaign",
                    fn: async () => {
                        const alias = this.generateUniqueAlias();
                        const res = await this.keitaroClient.updateCampaign(
                            result.cloCampaign.campaignId,
                            {
                                name: `CLO ${bundle_id} (${name})`,
                                alias,
                                traffic_source_id: result.trafficSourceId,
                                group_id: 39,
                            },
                        );
                        result.cloCampaign.campaignAlias = alias;
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${result.cloCampaign.campaignId}`,
                },
                {
                    key: "copyORGCampaign",
                    fn: async () => {
                        const res = await this.keitaroClient.copyCampaign(
                            orgCampaignTemplateId,
                        );

                        const campaign = Array.isArray(res) ? res[0] : res;

                        if (!campaign || !campaign.id) {
                            throw new BadRequestException(
                                `Failed to copy campaign: invalid response from API`,
                            );
                        }

                        result.orgCampaign = {
                            campaignId: campaign.id,
                            campaignToken: campaign.token,
                            campaignAlias: campaign.alias,
                            orgFalseId: null,
                        };

                        return res;
                    },
                    path: `admin_api/v1/campaigns/${orgCampaignTemplateId}/clone`,
                },
                {
                    key: "updateORGCampaign",
                    fn: async () => {
                        const alias = this.generateUniqueAlias();
                        const res = await this.keitaroClient.updateCampaign(
                            result.orgCampaign.campaignId,
                            {
                                name: `ORG ${bundle_id} (${name})`,
                                alias,
                                group_id: 144,
                            },
                        );
                        result.orgCampaign.campaignAlias = alias;
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${result.orgCampaign.campaignId}`,
                },
                {
                    key: "getORGCampaignFalseStreamId",
                    fn: async () => {
                        const res = await this.keitaroClient.getCampaignStreams(
                            result.orgCampaign.campaignId,
                        );

                        const orgFalseStream = res.find(
                            (stream) => stream.name === "false",
                        );
                        result.orgCampaign.orgFalseId =
                            orgFalseStream?.id || null;
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${result.orgCampaign.campaignId}/streams`,
                },
                {
                    key: "updateDefaultFlowWithOrgCampaign",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.updateDefaultFlowWithOrgCampaign(
                                result.cloCampaign.campaignId,
                                result.orgCampaign.campaignId,
                            );
                        return res;
                    },
                    path: `admin_api/v1/streams`,
                },
            ];

            for (const step of steps) {
                try {
                    results[step.key] = {
                        res: await step.fn(),
                        path: step.path,
                    };
                } catch (stepError) {
                    this.handleStepError(step, stepError);
                }
            }

            return result;
        } catch (error) {
            Logger.error(
                "Error creating app resources",
                {
                    error: error.message,
                    bundle_id: body.bundle_id,
                    name: body.name,
                    isAndroid: body.isAndroid,
                    isIos: body.isIos,
                },
                "AppsService",
            );

            for (const step of Object.values(results).reverse()) {
                if (step.res?.id) {
                    try {
                        await this.keitaroClient.deleteResource(
                            step.path,
                            step.res.id,
                        );
                    } catch (deleteError) {
                        Logger.error(
                            `Failed to delete resource`,
                            {
                                path: step.path,
                                id: step.res.id,
                                error: deleteError.message,
                            },
                            "AppsService",
                        );
                    }
                }
            }

            throw error;
        }
    }

    private async createCloAppInternal(body: CreateAppDto) {
        const results: Record<string, { res: any; path: string }> = {};
        try {
            const { name, bundle_id, sub_id, postback_url } = body;

            if (!name || !bundle_id) {
                throw new BadRequestException("Missing required fields.");
            }

            const result: CreateAppResultInterface = {
                trafficSourceId: null,
                cloCampaign: {
                    campaignId: null,
                    campaignToken: null,
                    campaignAlias: null,
                    clTrueId: null,
                    clFalseId: null,
                },
            };

            const templateId = this.configService.get<number>(
                "keitaro.newFlowCloCampaignTemplateId",
            );

            if (!templateId || isNaN(templateId)) {
                throw new BadRequestException(
                    "Template ID not found. Please configure keitaro.newFlowCloCampaignTemplateId",
                );
            }

            const steps = [
                {
                    key: "trafficSource",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.createTrafficSource(
                                `${bundle_id} (${name})`,
                                sub_id,
                                postback_url,
                            );
                        result.trafficSourceId = res.id;
                        return res;
                    },
                    path: "admin_api/v1/traffic_sources",
                },
                {
                    key: "copyCLOCampaign",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.copyCampaign(templateId);

                        const campaign = Array.isArray(res) ? res[0] : res;

                        if (!campaign || !campaign.id) {
                            throw new BadRequestException(
                                `Failed to copy campaign: invalid response from API`,
                            );
                        }

                        result.cloCampaign = {
                            campaignId: campaign.id,
                            campaignToken: `${campaign.token}`,
                            campaignAlias: `${campaign.alias}`,
                            clTrueId: null,
                            clFalseId: null,
                        };
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${templateId}/clone`,
                },
                {
                    key: "updateCLOCampaign",
                    fn: async () => {
                        const alias = this.generateUniqueAlias();
                        const res = await this.keitaroClient.updateCampaign(
                            result.cloCampaign.campaignId,
                            {
                                name: `APP ${bundle_id} (${name})`,
                                alias,
                                traffic_source_id: result.trafficSourceId,
                                group_id: 39,
                            },
                        );
                        result.cloCampaign.campaignAlias = alias;
                        return res;
                    },
                    path: `admin_api/v1/campaigns/${result.cloCampaign.campaignId}`,
                },
            ];

            for (const step of steps) {
                try {
                    results[step.key] = {
                        res: await step.fn(),
                        path: step.path,
                    };
                } catch (stepError) {
                    this.handleStepError(step, stepError);
                }
            }

            return result;
        } catch (error) {
            Logger.error(
                "Error creating app resources",
                {
                    error: error.message,
                    bundle_id: body.bundle_id,
                    name: body.name,
                    isAndroid: body.isAndroid,
                    isIos: body.isIos,
                },
                "AppsService",
            );

            for (const step of Object.values(results).reverse()) {
                if (step.res?.id) {
                    try {
                        await this.keitaroClient.deleteResource(
                            step.path,
                            step.res.id,
                        );
                    } catch (deleteError) {
                        Logger.error(
                            `Failed to delete resource`,
                            {
                                path: step.path,
                                id: step.res.id,
                                error: deleteError.message,
                            },
                            "AppsService",
                        );
                    }
                }
            }

            throw error;
        }
    }

    private generateUniqueAlias() {
        const characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const aliasLength = 9;
        let result = "";
        for (let i = 0; i < aliasLength; i++) {
            result += characters.charAt(
                Math.floor(Math.random() * characters.length),
            );
        }
        return result;
    }

    private handleStepError(
        step: { key: string; path: string },
        stepError: any,
    ): never {
        const aliasErrorMessage = this.extractAliasErrorMessage(stepError);

        Logger.error(
            `Step failed: ${step.key}`,
            {
                step: step.key,
                path: step.path,
                error: aliasErrorMessage ?? stepError.message,
                statusCode: stepError.response?.status,
                responseData: stepError.response?.data,
                axiosRequest: {
                    url: stepError.config?.url,
                    method: stepError.config?.method?.toUpperCase(),
                    headers: stepError.config?.headers,
                    data: stepError.config?.data,
                    params: stepError.config?.params,
                },
                axiosResponse: {
                    status: stepError.response?.status,
                    statusText: stepError.response?.statusText,
                    data: stepError.response?.data,
                    headers: stepError.response?.headers,
                },
            },
            "AppsV2Service",
        );

        if (aliasErrorMessage) {
            throw new BadRequestException(aliasErrorMessage);
        }

        throw stepError;
    }

    private extractAliasErrorMessage(error: any): string | null {
        const aliasErrors = error?.response?.data?.alias;

        if (!aliasErrors) {
            return null;
        }

        if (Array.isArray(aliasErrors)) {
            return aliasErrors.join(", ");
        }

        if (typeof aliasErrors === "string") {
            return aliasErrors;
        }

        return null;
    }
}
