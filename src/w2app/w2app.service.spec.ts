import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { KeitaroService } from "../keitaro/keitaro.service";
import { W2appService } from "./w2app.service";

describe("W2appService", () => {
    let service: W2appService;
    let keitaroService: jest.Mocked<KeitaroService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                W2appService,
                {
                    provide: KeitaroService,
                    useValue: {
                        createCampaignRaw: jest.fn(),
                        createStream: jest.fn(),
                        deleteCampaign: jest.fn(),
                        getCampaignStreams: jest.fn(),
                        updateCampaign: jest.fn(),
                        updateStream: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === "w2app.campaignGroupId") return 12345;
                            if (key === "w2app.namingGroupId") return 12346;
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<W2appService>(W2appService);
        keitaroService = module.get(KeitaroService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("createSplitCampaign створює campaign та streams", async () => {
        keitaroService.createCampaignRaw.mockResolvedValue({
            id: 777,
            token: "token-1",
            alias: "alias-1",
        });
        keitaroService.createStream
            .mockResolvedValueOnce({ id: 1001 })
            .mockResolvedValueOnce({ id: 1002 })
            .mockResolvedValueOnce({ id: 1999 });

        const result = await service.createSplitCampaign({
            campaignName: "Split Demo",
            campaignType: "weight",
            uniquenessMethod: "ip_ua",
            cookiesTtlHours: 24,
            bindVisitors: "slo",
            apps: [
                {
                    appId: "fb66dbeb-1307-4339-981d-a4f5236f1eb9",
                    offerId: 501,
                    weight: 60,
                    streamName: "App 1",
                },
                {
                    appId: "ecf37f46-b90b-4f93-a996-9ce505f6f7f1",
                    offerId: 502,
                    weight: 40,
                    streamName: "App 2",
                },
            ],
            parameters: {
                sub_id_1: { name: "sub1", placeholder: "{sub1}", alias: "s1" },
            },
            defaultStream: {
                fallbackCampaignId: 132,
            },
        });

        expect(keitaroService.createCampaignRaw).toHaveBeenCalledTimes(1);
        expect(keitaroService.createStream).toHaveBeenCalledTimes(3);
        expect(result).toEqual({
            campaignId: 777,
            campaignToken: "token-1",
            campaignAlias: "alias-1",
            streamIds: [
                {
                    appId: "fb66dbeb-1307-4339-981d-a4f5236f1eb9",
                    splitStreamId: 1001,
                    offerId: 501,
                },
                {
                    appId: "ecf37f46-b90b-4f93-a996-9ce505f6f7f1",
                    splitStreamId: 1002,
                    offerId: 502,
                },
            ],
            defaultStreamId: 1999,
        });
    });

    it("createSplitCampaign робить rollback при помилці створення stream", async () => {
        keitaroService.createCampaignRaw.mockResolvedValue({
            id: 778,
            token: "token-2",
            alias: "alias-2",
        });
        keitaroService.createStream.mockRejectedValue(
            new Error("stream create failed"),
        );

        await expect(
            service.createSplitCampaign({
                campaignName: "Split Rollback",
                campaignType: "weight",
                uniquenessMethod: "ip_ua",
                cookiesTtlHours: 24,
                bindVisitors: "slo",
                apps: [
                    {
                        appId: "ed2836e1-96b4-42ef-9618-d95b6d7ee9b4",
                        offerId: 601,
                        weight: 100,
                        streamName: "App 1",
                    },
                ],
                parameters: {},
                defaultStream: { fallbackCampaignId: 132 },
            }),
        ).rejects.toThrow("stream create failed");

        expect(keitaroService.deleteCampaign).toHaveBeenCalledWith("778");
    });

    it("getSplitCampaignState парсить appId з comments", async () => {
        keitaroService.getCampaignStreams.mockResolvedValue([
            {
                id: 1,
                type: "regular",
                comments: "onyx:6f8bc33e-3472-4e4d-b422-4d06ad477e91",
                offers: [{ offer_id: 700 }],
                weight: 35,
                state: "active",
            },
            {
                id: 2,
                type: "default",
            },
        ]);

        const state = await service.getSplitCampaignState(777);
        expect(state).toEqual({
            campaignId: 777,
            apps: [
                {
                    appId: "6f8bc33e-3472-4e4d-b422-4d06ad477e91",
                    offerId: 700,
                    weight: 35,
                    isActive: true,
                },
            ],
        });
    });

    it("updateSplitCampaign валідує суму ваг", async () => {
        await expect(
            service.updateSplitCampaign(10, {
                apps: [
                    {
                        appId: "ec95faf9-abeb-40cc-9b81-c58cc81a5cf6",
                        offerId: 1,
                        weight: 30,
                        streamName: "A",
                    },
                    {
                        appId: "f88f8dfd-a8a2-4e1c-b2f7-f6a1d10a17f1",
                        offerId: 2,
                        weight: 30,
                        streamName: "B",
                    },
                ],
            }),
        ).rejects.toThrow(BadRequestException);
    });

    it("banAppInSplit ставить target у 0 і перебалансовує решту", async () => {
        keitaroService.getCampaignStreams.mockResolvedValue([
            {
                id: 11,
                type: "regular",
                comments: "onyx:7ce5adad-b58f-4f9f-b1fe-e8937db55f2f",
                weight: 60,
                state: "active",
            },
            {
                id: 12,
                type: "regular",
                comments: "onyx:42af4ae8-31cb-4d4f-9412-1dc57749fcbc",
                weight: 40,
                state: "active",
            },
        ]);

        await service.banAppInSplit(100, {
            appId: "7ce5adad-b58f-4f9f-b1fe-e8937db55f2f",
        });

        expect(keitaroService.updateStream).toHaveBeenNthCalledWith(1, 11, {
            weight: 0,
            state: "disabled",
        });
        expect(keitaroService.updateStream).toHaveBeenNthCalledWith(2, 12, {
            weight: 100,
            state: "active",
        });
    });

    it("unbanAppInSplit ребалансує лише активні + target", async () => {
        keitaroService.getCampaignStreams.mockResolvedValue([
            {
                id: 21,
                type: "regular",
                comments: "onyx:6ca61a13-ac03-4c5e-8b4f-d9e56a3960b5",
                weight: 0,
                state: "disabled",
            },
            {
                id: 22,
                type: "regular",
                comments: "onyx:e62547f1-22f8-4d75-8d79-b03cf6d2745a",
                weight: 100,
                state: "active",
            },
            {
                id: 23,
                type: "regular",
                comments: "onyx:43f07c5b-2435-4908-8f64-7d82b8d7af96",
                weight: 0,
                state: "disabled",
            },
        ]);

        await service.unbanAppInSplit(100, {
            appId: "6ca61a13-ac03-4c5e-8b4f-d9e56a3960b5",
        });

        expect(keitaroService.updateStream).toHaveBeenCalledTimes(2);
        expect(keitaroService.updateStream).toHaveBeenCalledWith(21, {
            weight: 1,
            state: "active",
        });
        expect(keitaroService.updateStream).toHaveBeenCalledWith(22, {
            weight: 99,
            state: "active",
        });
    });

    it("createNamingCampaign кидає помилку, якщо Keitaro повернув невалідний id", async () => {
        keitaroService.createCampaignRaw.mockResolvedValue({
            id: Number.NaN,
            token: "bad-token",
        });

        await expect(
            service.createNamingCampaign({
                flowName: "Flow A",
                aliases: { sub_id_1: "alias_1" },
            }),
        ).rejects.toThrow("Keitaro returned invalid campaign id");
    });
});
