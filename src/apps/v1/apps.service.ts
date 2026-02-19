import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { KeitaroService } from "../../keitaro/keitaro.service";
import { CampaignDataService } from "../campaign-data.service";
import { wrapWithErrorHandler } from "../../utils/error-wrapper";
import { Logger } from "../../utils/logger";
import { CreateAppDto } from "../dto/create-app.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";
import { CopyCampaignDto } from "../dto/copy-campaign.dto";
import { CreateNoOrgCampaignDto } from "../dto/create-no-org-campaign.dto";
import { CampaignUserDocument } from "../../database/schemas/campaign-user.model";
import { ProvidersDB } from "../../common/enums/db-enums";
import { Model } from "mongoose";
import { IosAppDocument } from "../../database/schemas/ios-app.model";
import { AndroidAppDocument } from "../../database/schemas/android-app.model";
import { CreateByOfferDto } from "../dto/create-by-offer.dto";
import { CreateOnelinkCampaignDto } from "../dto/create-onelink.campaign.dto";
import { ICampaign, ICampaignCreate } from "../interfaces/campaign.interface";
import { IStreamCreate } from "../interfaces/stream.interface";
import { CreateRentCampaignDto } from "../dto/create-rent.campaign.dto";
import { UpdateCampaignDto } from "../dto/update-campaign.dto";
import { SyncAppDto } from "../dto/sync-app.dto";
import { CloseCloakDto } from "../dto/close-cloak.dto";
import { CloseGeoDto } from "../dto/close-geo.dto";
import { ShareNamingDto, NamingItemDto } from "../dto/share-naming.dto";
import { AllowTrafficDto } from "../dto/allow-traffic.dto";
import { ToggleTestFlowDto } from "../dto/toggle-test-flow.dto";
import { ValidateIntegrationDto } from "../dto/validate-integration.dto";
import { ToggleDenyOrgTrafficDto } from "../dto/toggle-deny-org-traffic.dto";
import { UpdateStreamDto } from "../dto/update-stream.dto";
import { QueueService } from "../../queue/queue.service";
import { NamingSharingJobData } from "../../queue/queues/naming-sharing.types";

@Injectable()
export class AppsService {
    constructor(
        private readonly keitaroClient: KeitaroService,
        private readonly campaignDataService: CampaignDataService,
        private readonly configService: ConfigService,
        private readonly queueService: QueueService,
        @Inject(ProvidersDB.CAMPAIGN_USER)
        private readonly campaignUserModel: Model<CampaignUserDocument>,
        @Inject(ProvidersDB.IOS_APP)
        private readonly iosAppModel: Model<IosAppDocument>,
        @Inject(ProvidersDB.ANDROID_APP)
        private readonly androidAppModel: Model<AndroidAppDocument>,
    ) {}

    async getAllCampaigns() {
        const getAllCampaignsWithErrorHandler = wrapWithErrorHandler(
            this.getAllCampaignsInternal.bind(this),
            {
                functionName: "AppsService.getAllCampaigns",
                additionalData: { endpoint: "GET /v1/apps/all-campaigns" },
            },
        );

        return getAllCampaignsWithErrorHandler();
    }

    async createApp(body: CreateAppDto) {
        const createAppWithErrorHandler = wrapWithErrorHandler(
            this.createAppInternal.bind(this),
            {
                functionName: "AppsService.createApp",
                additionalData: { endpoint: "POST /v1/apps/create-campaign" },
            },
        );

        return createAppWithErrorHandler(body);
    }

    async createRentCampaign(body: CreateRentCampaignDto) {
        const createRentCampaignWithErrorHandler = wrapWithErrorHandler(
            this.createRentCampaignInternal.bind(this),
            {
                functionName: "AppsService.createRentCampaign",
                additionalData: {
                    endpoint: "POST /v1/apps/create-rent-campaign",
                },
            },
        );
        return createRentCampaignWithErrorHandler(body);
    }

    async copyCampaign(body: CopyCampaignDto) {
        const copyCampaignWithErrorHandler = wrapWithErrorHandler(
            this.copyCampaignInternal.bind(this),
            {
                functionName: "AppsService.copyCampaign",
                additionalData: { endpoint: "POST /v1/apps/copy-campaign" },
            },
        );

        return copyCampaignWithErrorHandler(body);
    }

    async createNoOrgCampaign(body: CreateNoOrgCampaignDto) {
        const createNoOrgCampaignWithErrorHandler = wrapWithErrorHandler(
            this.createNoOrgCampaignInternal.bind(this),
            {
                functionName: "AppsService.createNoOrgCampaign",
                additionalData: {
                    endpoint: "POST /v1/apps/create-no-org-campaign",
                },
            },
        );

        return createNoOrgCampaignWithErrorHandler(body);
    }

    async createByOffer(body: CreateByOfferDto) {
        const createByOfferWithErrorHandler = wrapWithErrorHandler(
            this.createByOfferInternal.bind(this),
            {
                functionName: "AppsService.createByOffer",
                additionalData: { endpoint: "POST /v1/apps/create-by-offer" },
            },
        );

        return createByOfferWithErrorHandler(body);
    }

    async createOnelinkCampaign(body: CreateOnelinkCampaignDto) {
        const createOnelinkCampaignWithErrorHandler = wrapWithErrorHandler(
            this.createOnelinkCampaignInternal.bind(this),
            {
                functionName: "AppsService.createOnelinkCampaign",
                additionalData: {
                    endpoint: "POST /v1/apps/create-onelink-campaign",
                },
            },
        );

        return createOnelinkCampaignWithErrorHandler(body);
    }

    async deleteCampaign(id: string) {
        const deleteCampaignWithErrorHandler = wrapWithErrorHandler(
            this.deleteCampaignInternal.bind(this),
            {
                functionName: "AppsService.createOnelinkCampaign",
                additionalData: {
                    endpoint: "DELETE /v1/apps/campaign/:id",
                },
            },
        );

        return deleteCampaignWithErrorHandler(id);
    }

    async deleteTrafficSource(id: string) {
        const deleteTrafficSourceWithErrorHandler = wrapWithErrorHandler(
            this.deleteTrafficSourceInternal.bind(this),
            {
                functionName: "AppsService.deleteTrafficSource",
                additionalData: {
                    endpoint: "DELETE /v1/apps/traffic-source/:id",
                },
            },
        );

        return deleteTrafficSourceWithErrorHandler(id);
    }

    async getFullCampaignInfo(id: string) {
        const getFullCampaignInfoWithErrorHandler = wrapWithErrorHandler(
            this.getFullCampaignInfoInternal.bind(this),
            {
                functionName: "AppsService.getFullCampaignInfo",
                additionalData: {
                    endpoint: "GET /v1/apps/full-campaign-info/:id",
                },
            },
        );

        return getFullCampaignInfoWithErrorHandler(id);
    }

    async getCampaignStreams(id: string) {
        const getCampaignStreamsWithErrorHandler = wrapWithErrorHandler(
            this.getCampaignStreamsInternal.bind(this),
            {
                functionName: "AppsService.getCampaignStreams",
                additionalData: {
                    endpoint: "GET /v1/apps/campaign/:id/streams",
                },
            },
        );

        return getCampaignStreamsWithErrorHandler(id);
    }

    async getStreamById(id: string) {
        const getStreamByIdWithErrorHandler = wrapWithErrorHandler(
            this.getStreamByIdInternal.bind(this),
            {
                functionName: "AppsService.getStreamById",
                additionalData: {
                    endpoint: "GET /v1/apps/streams/:id",
                },
            },
        );

        return getStreamByIdWithErrorHandler(id);
    }

    async updateCampaign(id: string, body: UpdateCampaignDto) {
        const updateCampaignWithErrorHandler = wrapWithErrorHandler(
            this.updateCampaignInternal.bind(this),
            {
                functionName: "AppsService.updateCampaign",
                additionalData: {
                    endpoint: "PUT /v1/apps/campaign/:id",
                },
            },
        );

        return updateCampaignWithErrorHandler(id, body);
    }

    async syncApp(body: SyncAppDto) {
        const syncAppWithErrorHandler = wrapWithErrorHandler(
            this.syncAppInternal.bind(this),
            {
                functionName: "AppsService.syncApp",
                additionalData: {
                    endpoint: "POST /v1/apps/sync",
                },
            },
        );

        return syncAppWithErrorHandler(body);
    }

    async closeCloak(body: CloseCloakDto) {
        const closeCloakWithErrorHandler = wrapWithErrorHandler(
            this.closeCloakInternal.bind(this),
            {
                functionName: "AppsService.closeCloak",
                additionalData: {
                    endpoint: "POST /v1/apps/close-cloak",
                },
            },
        );

        return closeCloakWithErrorHandler(body);
    }

    async closeGeo(body: CloseGeoDto) {
        const closeGeoWithErrorHandler = wrapWithErrorHandler(
            this.closeGeoInternal.bind(this),
            {
                functionName: "AppsService.closeGeo",
                additionalData: {
                    endpoint: "POST /v1/apps/close-geo",
                },
            },
        );

        return closeGeoWithErrorHandler(body);
    }

    async shareNaming(body: ShareNamingDto) {
        const { campaignId, appId, items } = body;

        if (!campaignId || !items || items.length === 0) {
            return {
                success: false,
                error: "Validation failed",
                message: "campaignId and items array are required",
            };
        }

        if (items.length > 10) {
            return {
                success: false,
                error: "Batch size exceeded",
                message: "Maximum 10 items per batch",
                received: items.length,
            };
        }

        const uniqueItemsMap = new Map<string, NamingItemDto>();
        const duplicates: string[] = [];

        for (const item of items) {
            if (uniqueItemsMap.has(item.naming)) {
                duplicates.push(item.naming);
                uniqueItemsMap.set(item.naming, item);
            } else {
                uniqueItemsMap.set(item.naming, item);
            }
        }

        const uniqueItems = Array.from(uniqueItemsMap.values());

        if (duplicates.length > 0) {
            Logger.warn(
                `Duplicate naming items found and deduplicated: ${duplicates.join(", ")}. Using the last value for each duplicate.`,
                {
                    campaignId,
                    appId,
                    duplicates,
                    originalCount: items.length,
                    uniqueCount: uniqueItems.length,
                },
                "AppsService.shareNaming",
            );
        }

        const jobData: NamingSharingJobData = {
            campaignId,
            appId,
            items: uniqueItems.map((item) => ({
                naming: item.naming,
                targetCampaignId: item.targetCampaignId,
                keitaroCampaign: item.keitaroCampaign, // Передаємо keitaroCampaign для кожного naming
                oldKeitaroCampaign: item.oldKeitaroCampaign, // Передаємо стару кампанію для міграції stream
            })),
        };

        try {
            const queue = this.queueService.getNamingSharingQueue();
            const job = await queue.add("process-naming-batch", jobData);

            Logger.info(
                `Naming sharing job added: ${job.id} for ${uniqueItems.length} unique namings (${items.length} original, ${duplicates.length} duplicates removed)`,
                {
                    campaignId,
                    appId,
                    itemsCount: uniqueItems.length,
                    originalCount: items.length,
                    duplicatesCount: duplicates.length,
                    namings: uniqueItems.map((i) => i.naming),
                },
                "AppsService.shareNaming",
            );

            return {
                success: true,
                jobId: job.id,
                queue: "naming-sharing",
                campaignId,
                appId,
                itemsCount: uniqueItems.length,
                originalItemsCount: items.length,
                duplicatesRemoved: duplicates.length,
                items: uniqueItems,
                message:
                    duplicates.length > 0
                        ? `Naming sharing job added to queue successfully. ${duplicates.length} duplicate(s) removed (using last value for each).`
                        : "Naming sharing job added to queue successfully",
            };
        } catch (error) {
            Logger.error(
                `Failed to add naming sharing job: ${error instanceof Error ? error.message : "Unknown error"}`,
                error instanceof Error ? error.stack : undefined,
                "AppsService.shareNaming",
            );

            return {
                success: false,
                error: "Failed to add job to queue",
                message:
                    error instanceof Error ? error.message : "Unknown error",
            };
        }
    }

    async allowAllTraffic(body: AllowTrafficDto) {
        const allowAllTrafficWithErrorHandler = wrapWithErrorHandler(
            this.allowAllTrafficInternal.bind(this),
            {
                functionName: "AppsService.allowAllTraffic",
                additionalData: {
                    endpoint: "POST /v1/apps/allow-all-traffic",
                },
            },
        );

        return allowAllTrafficWithErrorHandler(body);
    }

    async toggleTestFlow(body: ToggleTestFlowDto) {
        const toggleTestFlowWithErrorHandler = wrapWithErrorHandler(
            this.toggleTestFlowInternal.bind(this),
            {
                functionName: "AppsService.toggleTestFlow",
                additionalData: {
                    endpoint: "POST /v1/apps/toggle-test-flow",
                },
            },
        );

        return toggleTestFlowWithErrorHandler(body);
    }

    async validateIntegration(body: ValidateIntegrationDto) {
        const validateIntegrationWithErrorHandler = wrapWithErrorHandler(
            this.validateIntegrationInternal.bind(this),
            {
                functionName: "AppsService.validateIntegration",
                additionalData: {
                    endpoint: "POST /v1/apps/validate-integration",
                },
            },
        );

        return validateIntegrationWithErrorHandler(body);
    }

    async toggleDenyOrgTraffic(body: ToggleDenyOrgTrafficDto) {
        const toggleDenyOrgTrafficWithErrorHandler = wrapWithErrorHandler(
            this.toggleDenyOrgTrafficInternal.bind(this),
            {
                functionName: "AppsService.toggleDenyOrgTraffic",
                additionalData: {
                    endpoint: "POST /v1/apps/toggle-deny-org-traffic",
                },
            },
        );

        return toggleDenyOrgTrafficWithErrorHandler(body);
    }

    private async createRentCampaignInternal(body: CreateRentCampaignDto) {
        const { groupId, offerId, name } = body;
        if (!groupId || !offerId || !name) {
            throw new BadRequestException("Missing required fields.");
        }

        return await this.keitaroClient.createRentCampaign(
            groupId,
            offerId,
            name,
        );
    }

    private async deleteCampaignInternal(id: string) {
        return await this.keitaroClient.deleteCampaign(id);
    }

    private async deleteTrafficSourceInternal(id: string) {
        return await this.keitaroClient.deleteTrafficSource(id);
    }

    private parseNumberId(id: string, paramName: string): number {
        const parsedId = parseInt(id, 10);
        if (isNaN(parsedId)) {
            throw new BadRequestException(`Invalid ${paramName}`);
        }
        return parsedId;
    }

    private async getFullCampaignInfoInternal(id: string) {
        const campaignId = this.parseNumberId(id, "campaign ID");

        return await this.campaignDataService.getFullCampaignInfo(campaignId);
    }

    private async getCampaignStreamsInternal(id: string) {
        const campaignId = this.parseNumberId(id, "campaign ID");

        return await this.keitaroClient.getCampaignStreams(campaignId);
    }

    private async getStreamByIdInternal(id: string) {
        const streamId = this.parseNumberId(id, "stream ID");
        const stream = await this.keitaroClient.getStreamById(streamId);
        return stream;
    }

    async updateStream(id: string, body: UpdateStreamDto) {
        const updateStreamWithErrorHandler = wrapWithErrorHandler(
            this.updateStreamInternal.bind(this),
            {
                functionName: "AppsService.updateStream",
                additionalData: {
                    endpoint: "PUT /v1/apps/streams/:id",
                },
            },
        );

        return updateStreamWithErrorHandler(id, body);
    }

    private async updateStreamInternal(id: string, body: UpdateStreamDto) {
        const streamId = this.parseNumberId(id, "stream ID");

        return await this.keitaroClient.updateStream(streamId, body);
    }

    private async updateCampaignInternal(id: string, body: UpdateCampaignDto) {
        const campaignId = this.parseNumberId(id, "campaign ID");

        return await this.keitaroClient.updateCampaign(campaignId, body);
    }

    private async getAllCampaignsInternal() {
        return await this.keitaroClient.getAllCampaigns();
    }

    private async createOnelinkCampaignInternal(
        body: CreateOnelinkCampaignDto,
    ) {
        const { offer_id, bundle_id, app_name } = body;
        if (!offer_id || !bundle_id || !app_name) {
            throw new BadRequestException("Missing required fields.");
        }

        const alias = this.generateUniqueAlias();
        while (true) {
            const campaignData: ICampaignCreate = {
                name: `Onelink ${bundle_id} (${app_name})`,
                alias,
                traffic_source_id: 0,
                group_id: 40,
            };

            const createCampaignResponse: ICampaign =
                await this.keitaroClient.createCampaign(campaignData, true);

            const streamData: IStreamCreate = {
                type: "regular",
                name: "Flow 2",
                campaign_id: createCampaignResponse.id,
                position: 1,
                action_options: null,
                comments: "",
                state: "active",
                action_type: "http",
                action_payload: "",
                schema: "landings",
                collect_clicks: true,
                filter_or: false,
                weight: 100,
                offer_selection: "before_click",
                filters: [],
                triggers: [],
                landings: [
                    {
                        landing_id: 363,
                        state: "active",
                        share: 100,
                        created_at: "2025-05-14 15:31:25",
                        updated_at: "2025-06-12 09:04:50",
                    },
                ],
                offers: [
                    {
                        offer_id: Number(offer_id),
                        state: "active",
                        share: 100,
                        created_at: "2025-06-12 07:53:37",
                        updated_at: "2025-06-12 09:04:50",
                    },
                ],
            };

            await this.keitaroClient.createStream(
                createCampaignResponse.id,
                streamData,
            );

            return {
                id: createCampaignResponse.id,
            };
        }
    }

    private async createByOfferInternal(body: CreateByOfferDto) {
        const { offer_id } = body;
        if (!offer_id) {
            throw new BadRequestException("Missing required fields.");
        }

        const offer = await this.keitaroClient.getOfferById(Number(offer_id));

        let alias = this.generateUniqueAlias();
        while (true) {
            try {
                const createCampaignResponse =
                    await this.keitaroClient.createCampaign({
                        name: `Test [${offer.id}]`,
                        alias,
                        traffic_source_id: 22,
                        group_id: 8,
                    });

                const streamData: IStreamCreate = {
                    type: "regular",
                    name: "Flow 2",
                    campaign_id: createCampaignResponse.id,
                    position: 1,
                    action_options: null,
                    comments: "",
                    state: "active",
                    action_type: "http",
                    action_payload: "",
                    schema: "landings",
                    collect_clicks: true,
                    filter_or: false,
                    weight: 100,
                    offer_selection: "before_click",
                    filters: [],
                    triggers: [],
                    landings: [],
                    offers: [
                        {
                            offer_id: offer.id,
                            state: "active",
                            share: 100,
                        },
                    ],
                };

                await this.keitaroClient.createStream(
                    createCampaignResponse.id,
                    streamData,
                );

                return {
                    name: offer.name,
                    alias,
                    user_id:
                        createCampaignResponse.parameters.sub_id_15.placeholder,
                };
            } catch (error) {
                if (error?.response?.data?.alias?.length) {
                    alias = this.generateUniqueAlias();
                } else {
                    throw error;
                }
            }
        }
    }

    private async createNoOrgCampaignInternal(body: CreateNoOrgCampaignDto) {
        const { name, bundle, buyerId } = body;
        let isIos = false;
        if (!name || !bundle || !buyerId) {
            throw new BadRequestException("Missing required fields.");
        }

        let trafficSourceId;
        let appResult;
        const buyer = await this.campaignUserModel.findOne({ sub: buyerId });

        if (!buyer) {
            throw new BadRequestException("Buyer not found.");
        }

        appResult = await this.iosAppModel.findOne({ appID: bundle });

        if (appResult) {
            trafficSourceId = appResult.keitaroID;
            isIos = true;
        } else {
            appResult = await this.androidAppModel.findOne({
                bundleID: bundle,
            });
        }

        if (!appResult) {
            throw new BadRequestException("App not found.");
        }

        trafficSourceId = appResult.keitaroID;

        const result = {
            trafficSourceId,
            noOrgCampaign: {
                campaignId: null,
                campaignToken: null,
                campaignAlias: null,
            },
            name: "",
        };

        const createNoOrgCampaign = async () => {
            let alias = this.generateUniqueAlias();
            while (true) {
                try {
                    const campaignData: ICampaignCreate = {
                        name: `${buyer.nickName} (${buyer.sub}) (${appResult.name})`,
                        alias,
                        traffic_source_id: result.trafficSourceId,
                        group_id: Number(buyer.group_id),
                        sub_id: buyer.sub,
                    };
                    const noOrgCampaignResponse =
                        await this.keitaroClient.createCampaign(campaignData);

                    result.noOrgCampaign.campaignId = `${noOrgCampaignResponse.id}`;
                    result.noOrgCampaign.campaignToken = `${noOrgCampaignResponse.token}`;
                    result.noOrgCampaign.campaignAlias = `${noOrgCampaignResponse.alias}`;
                    result.name = `${noOrgCampaignResponse.name}`;
                    return { alias, result: noOrgCampaignResponse };
                } catch (error) {
                    if (error?.response?.data?.alias?.length) {
                        alias = this.generateUniqueAlias();
                    } else {
                        throw error;
                    }
                }
            }
        };

        const { alias, result: noOrgCampaignResponse } =
            await createNoOrgCampaign();

        const updatePostBackData = {
            postbacks: [
                {
                    campaign_id: noOrgCampaignResponse.id,
                    method: "GET",
                    url: "https://europe-west3-my-wallet-333322.cloudfunctions.net/handleTGmessage?status=dep&offer={offer_name}&user_id={user_id}&subid={subid}&country={country}&campaign={campaign_name}&revenue={conversion_revenue}&conversion={_conversion_time:Y-m-d%20H:i:s,Europe/Kyiv}&sub1={sub_id_1}&sub2={sub_id_2}&sub3={sub_id_3}&sub4={sub_id_4}&sub5={sub_id_5}&sub6={sub_id_6}&naming={sub_id_17}&os={os}&click_time={_date:Y-m-d%20H:i:s,Europe/Kyiv}",
                    statuses: ["sale"],
                },
            ],
        };

        if (isIos) {
            updatePostBackData.postbacks.push({
                campaign_id: noOrgCampaignResponse.id,
                method: "GET",
                url: "https://stage.linkfactory.site/w2a-events?subid={sub_id_18}&event={status}&payout={revenue}&tr=new",
                statuses: ["sale", "lead"],
            });
        }

        await this.keitaroClient.updateNoOrgCampaignPostback(
            updatePostBackData,
            noOrgCampaignResponse.id,
        );

        await this.keitaroClient.createNoORGCampaignStreams(
            result.noOrgCampaign.campaignId,
            isIos,
        );

        return { ...result, alias };
    }

    private async copyCampaignInternal(body: CopyCampaignDto) {
        const { id, group_id, name, sub_id, change_parameters } = body;

        if (!id || !group_id || !name) {
            throw new BadRequestException("Missing required fields.");
        }

        if (typeof id !== "number" || isNaN(id) || id <= 0) {
            throw new BadRequestException(
                `Invalid campaign template ID: ${id}. Must be a positive number.`,
            );
        }

        const alias = this.generateUniqueAlias();

        const copyResult = await this.keitaroClient.copyCampaign(id);

        if (
            !copyResult ||
            !Array.isArray(copyResult) ||
            copyResult.length === 0
        ) {
            throw new BadRequestException(
                `Failed to copy campaign. Invalid response from Keitaro API.`,
            );
        }

        const copiedCampaign = copyResult[0];
        if (!copiedCampaign || !copiedCampaign.id) {
            throw new BadRequestException(
                `Failed to copy campaign. Copied campaign data is invalid.`,
            );
        }

        const data: any = {
            name,
            alias,
            group_id: +group_id,
        };
        if (change_parameters) {
            data.parameters = {
                ...copiedCampaign.parameters,
                sub_id_15: {
                    name: "user_id",
                    placeholder: sub_id,
                    alias: "",
                },
            };
        }

        return await this.keitaroClient.updateCampaign(copiedCampaign.id, data);
    }

    private async createAppInternal(body: CreateAppDto) {
        const results: Record<string, { res: any; path: string }> = {};
        try {
            const { name, bundle_id, sub_id, postback_url, isAndroid, isIos } =
                body;

            if (!name || !bundle_id) {
                throw new BadRequestException("Missing required fields.");
            }

            const orgGroupId = this.configService.get("keitaro.orgGroupId");
            const cloGroupId = this.configService.get("keitaro.cloGroupId");

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
                    key: "cloCampaign",
                    fn: async () => {
                        let alias = this.generateUniqueAlias();
                        const iosSubId =
                            this.configService.get("keitaro.iosSubId");
                        const androidSubId = this.configService.get(
                            "keitaro.androidSubId",
                        );

                        if (!iosSubId || !androidSubId) {
                            throw new BadRequestException(
                                "Missing required iosSubId or androidSubId fields in .env file.",
                            );
                        }
                        while (true) {
                            try {
                                const res =
                                    await this.keitaroClient.createCampaign({
                                        name: `CLO ${bundle_id} (${name})`,
                                        alias,
                                        traffic_source_id:
                                            result.trafficSourceId,
                                        group_id: cloGroupId,
                                        sub_id: isAndroid
                                            ? androidSubId
                                            : iosSubId,
                                    });
                                result.cloCampaign = {
                                    campaignId: res.id,
                                    campaignToken: `${res.token}`,
                                    campaignAlias: `${res.alias}`,
                                    clTrueId: res.clTrueId,
                                    clFalseId: res.clFalseId,
                                };
                                return res;
                            } catch (error) {
                                if (error?.response?.data?.alias?.length) {
                                    alias = this.generateUniqueAlias();
                                } else {
                                    throw error;
                                }
                            }
                        }
                    },
                    path: "admin_api/v1/campaigns",
                },
                {
                    key: "cloStreams",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.createCLOCampaignStreams(
                                result.cloCampaign.campaignId,
                                isAndroid,
                                isIos,
                            );
                        result.cloCampaign.clTrueId = res.clTrueId || null;
                        result.cloCampaign.clFalseId = res.clFalseId || null;
                        return res;
                    },
                    path: "admin_api/v1/streams",
                },
                {
                    key: "orgCampaign",
                    fn: async () => {
                        let alias = this.generateUniqueAlias();
                        while (true) {
                            try {
                                const res =
                                    await this.keitaroClient.createCampaign({
                                        name: `ORG ${bundle_id} (${name})`,
                                        alias,
                                        traffic_source_id:
                                            result.trafficSourceId,
                                        group_id: orgGroupId,
                                        sub_id,
                                    });
                                result.orgCampaign = {
                                    campaignId: res.id,
                                    campaignToken: `${res.token}`,
                                    campaignAlias: `${res.alias}`,
                                    orgFalseId: res.orgFalseId,
                                };
                                return res;
                            } catch (error) {
                                if (error?.response?.data?.alias?.length) {
                                    alias = this.generateUniqueAlias();
                                } else {
                                    throw error;
                                }
                            }
                        }
                    },
                    path: "admin_api/v1/campaigns",
                },
                {
                    key: "orgStreams",
                    fn: async () => {
                        const res =
                            await this.keitaroClient.createORGCampaignStreams(
                                result.orgCampaign.campaignId,
                                isIos,
                            );
                        result.orgCampaign.orgFalseId = res.orgFalseId || null;
                        return res;
                    },
                    path: "admin_api/v1/streams",
                },
                {
                    key: "appDefaultFlow",
                    fn: async () => {
                        // Створюємо/оновлюємо default flow в APP campaign з редиректом на ORG campaign
                        const res =
                            await this.keitaroClient.updateDefaultFlowWithOrgCampaign(
                                result.cloCampaign.campaignId,
                                result.orgCampaign.campaignId,
                            );
                        Logger.info(
                            `Default flow configured for APP campaign ${result.cloCampaign.campaignId} to redirect to ORG campaign ${result.orgCampaign.campaignId}`,
                            {
                                appCampaignId: result.cloCampaign.campaignId,
                                orgCampaignId: result.orgCampaign.campaignId,
                            },
                            "AppsService.createAppInternal",
                        );
                        return res;
                    },
                    path: "admin_api/v1/streams",
                },
            ];

            for (const step of steps) {
                results[step.key] = { res: await step.fn(), path: step.path };
            }

            return result;
        } catch (error) {
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

    private async syncAppInternal(body: SyncAppDto) {
        const {
            id,
            name,
            platform,
            keitaroSourceId,
            keitaroCloCampId,
            oldKeitaroSourceId,
        } = body;

        if (!id || !name || !platform) {
            throw new BadRequestException(
                "Missing required fields: id, name, platform",
            );
        }

        const appData = {
            id,
            name,
            platform,
            keitaroSourceId,
            keitaroCloCampId,
            oldKeitaroSourceId,
        };

        return await this.keitaroClient.syncAppWithKeitaro(appData);
    }

    private async closeCloakInternal(body: CloseCloakDto) {
        const { campaignId } = body;

        if (!campaignId) {
            throw new BadRequestException("Missing required field: campaignId");
        }

        return await this.keitaroClient.closeCloak(campaignId);
    }

    private extractCampaignId(body: any): number | undefined {
        if (body.campaignId !== undefined) {
            return body.campaignId;
        }

        if ((body as any).campaign_id !== undefined) {
            Logger.warn(
                "Deprecated: Using snake_case 'campaign_id' is deprecated. Please use camelCase 'campaignId' instead.",
                {
                    endpoint: "campaignId extraction",
                    deprecatedField: "campaign_id",
                    recommendedField: "campaignId",
                },
                "AppsService",
            );
            return (body as any).campaign_id;
        }

        return undefined;
    }

    private async allowAllTrafficInternal(body: AllowTrafficDto) {
        const campaignId = this.extractCampaignId(body);
        const allow = body.allow;

        if (!campaignId) {
            throw new BadRequestException("Missing required field: campaignId");
        }

        return await this.keitaroClient.allowAllTraffic(campaignId, allow);
    }

    private async closeGeoInternal(body: CloseGeoDto) {
        const { campaignId, geoCode } = body;

        if (!campaignId || !geoCode) {
            throw new BadRequestException(
                "Missing required fields: campaignId, geoCode",
            );
        }

        return await this.keitaroClient.closeGeo(campaignId, geoCode);
    }

    private async toggleTestFlowInternal(body: ToggleTestFlowDto) {
        const campaignId = this.extractCampaignId(body);
        const enable = body.enable;

        if (!campaignId || enable === undefined || enable === null) {
            throw new BadRequestException(
                "Missing required fields: campaignId, enable",
            );
        }

        return await this.keitaroClient.toggleTestFlow(campaignId, enable);
    }

    private async validateIntegrationInternal(body: ValidateIntegrationDto) {
        const campaignId = this.extractCampaignId(body);

        if (campaignId === undefined) {
            throw new BadRequestException("Missing required field: campaignId");
        }

        return await this.keitaroClient.validateIntegration(
            campaignId,
            body.appId,
        );
    }

    private async toggleDenyOrgTrafficInternal(body: ToggleDenyOrgTrafficDto) {
        const campaignId = this.extractCampaignId(body);
        const enable = body.enable;

        if (!campaignId || enable === undefined || enable === null) {
            throw new BadRequestException(
                "Missing required fields: campaignId, enable",
            );
        }

        return await this.keitaroClient.toggleDenyOrgTraffic(
            campaignId,
            enable,
        );
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
}
