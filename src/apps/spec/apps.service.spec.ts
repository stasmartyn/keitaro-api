import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";

import { AppsService } from "../v1/apps.service";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { CampaignDataService } from "../campaign-data.service";
import { Logger } from "../../utils/logger";
import { CreateAppDto } from "../dto/create-app.dto";

jest.spyOn(Logger, "error").mockImplementation(() => {});
import { CopyCampaignDto } from "../dto/copy-campaign.dto";
import { CreateByOfferDto } from "../dto/create-by-offer.dto";
import { CreateOnelinkCampaignDto } from "../dto/create-onelink.campaign.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";
import { QueueService } from "../../queue/queue.service";

describe("AppsService", () => {
    let service: AppsService;
    let keitaroService: jest.Mocked<KeitaroService>;
    let configService: jest.Mocked<ConfigService>;

    const mockCreateAppResult: CreateAppResultInterface = {
        trafficSourceId: 123,
        orgCampaign: {
            campaignId: 456,
            campaignToken: "org-token-123",
            campaignAlias: "org-alias-123",
            orgFalseId: 789,
        },
        cloCampaign: {
            campaignId: 101,
            campaignToken: "clo-token-123",
            campaignAlias: "clo-alias-123",
            clTrueId: 202,
            clFalseId: 303,
        },
    };

    const mockCampaigns = [
        {
            id: 1,
            name: "Test Campaign 1",
            alias: "test1",
            token: "token1",
            traffic_source_id: 1,
            group_id: 1,
        },
        {
            id: 2,
            name: "Test Campaign 2",
            alias: "test2",
            token: "token2",
            traffic_source_id: 2,
            group_id: 2,
        },
    ];

    const mockCopiedCampaign = {
        id: 3,
        name: "Copied Campaign",
        alias: "copied-alias",
        token: "copied-token",
        traffic_source_id: 1,
        group_id: 1,
    };

    const mockTrafficSource = {
        id: 123,
        name: "Test Traffic Source",
        sub_id: "sub123",
        postback_url: "https://test.com/postback",
    };

    const mockCampaign = {
        id: 456,
        name: "Test Campaign",
        alias: "test-alias",
        token: "test-token",
        traffic_source_id: 123,
        group_id: 1,
        parameters: {
            sub_id_15: {
                name: "user_id",
                placeholder: "user123",
                alias: "",
            },
        },
    };

    const mockStream = {
        id: 789,
        name: "Test Stream",
        campaign_id: 456,
        type: "regular",
        state: "active",
    };

    const mockOffer = {
        id: 123,
        name: "Test Offer",
    };

    beforeEach(async () => {
        const mockKeitaroService = {
            getAllCampaigns: jest.fn(),
            createTrafficSource: jest.fn(),
            createCampaign: jest.fn(),
            copyCampaign: jest.fn(),
            updateCampaign: jest.fn(),
            updateDefaultFlowWithOrgCampaign: jest.fn(),
            createCLOCampaignStreams: jest.fn(),
            createORGCampaignStreams: jest.fn(),
            deleteResource: jest.fn(),
            getOfferById: jest.fn(),
            getCampaignStreams: jest.fn(),
            createStream: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const mockCampaignDataService = {
            getCampaignData: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppsService,
                {
                    provide: KeitaroService,
                    useValue: mockKeitaroService,
                },
                {
                    provide: CampaignDataService,
                    useValue: mockCampaignDataService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: QueueService,
                    useValue: {
                        getNamingSharingQueue: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AppsService>(AppsService);
        keitaroService = module.get(KeitaroService);
        configService = module.get(ConfigService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("getAllCampaigns", () => {
        it("should return all campaigns successfully", async () => {
            keitaroService.getAllCampaigns.mockResolvedValue(mockCampaigns);

            const result = await service.getAllCampaigns();

            expect(keitaroService.getAllCampaigns).toHaveBeenCalled();
            expect(result).toEqual(mockCampaigns);
        });

        it("should handle Keitaro service error", async () => {
            const error = new Error("Keitaro API error");
            keitaroService.getAllCampaigns.mockRejectedValue(error);

            await expect(service.getAllCampaigns()).rejects.toThrow();
            expect(keitaroService.getAllCampaigns).toHaveBeenCalled();
        });
    });

    describe("createApp", () => {
        const createAppDto: CreateAppDto = {
            name: "Test App",
            bundle_id: "com.test.app",
            sub_id: "sub123",
            postback_url: "https://test.com/postback",
            isAndroid: true,
            isIos: false,
            campaign_id: 123,
        };

        beforeEach(() => {
            configService.get.mockImplementation((key: string) => {
                if (key === "keitaro.orgGroupId") return 8;
                if (key === "keitaro.cloGroupId") return 39;
                if (key === "keitaro.iosSubId") return "ios-sub";
                if (key === "keitaro.androidSubId") return "android-sub";
                return null;
            });
        });

        it("should create app successfully", async () => {
            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.createCampaign
                .mockResolvedValueOnce({
                    ...mockCampaign,
                    clTrueId: 202,
                    clFalseId: 303,
                })
                .mockResolvedValueOnce({
                    ...mockCampaign,
                    orgFalseId: 789,
                });
            keitaroService.createCLOCampaignStreams.mockResolvedValue({
                clTrueId: 202,
                clFalseId: 303,
            });
            keitaroService.createORGCampaignStreams.mockResolvedValue({
                orgFalseId: 789,
            });

            const result = await service.createApp(createAppDto);

            expect(result).toMatchObject({
                trafficSourceId: mockCreateAppResult.trafficSourceId,
                orgCampaign: {
                    campaignId: expect.any(Number),
                    campaignToken: expect.any(String),
                    campaignAlias: expect.any(String),
                    orgFalseId: expect.any(Number),
                },
                cloCampaign: {
                    campaignId: expect.any(Number),
                    campaignToken: expect.any(String),
                    campaignAlias: expect.any(String),
                    clTrueId: expect.any(Number),
                    clFalseId: expect.any(Number),
                },
            });
            expect(keitaroService.createTrafficSource).toHaveBeenCalled();
            expect(keitaroService.createCampaign).toHaveBeenCalledTimes(2);
        });

        it("should throw BadRequestException for missing required fields", async () => {
            const invalidDto = {
                name: "",
                bundle_id: "",
            } as CreateAppDto;

            await expect(service.createApp(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("should handle alias conflict and retry", async () => {
            const aliasConflictError = {
                response: {
                    data: {
                        alias: ["Alias already exists"],
                    },
                },
            };

            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.createCampaign
                .mockRejectedValueOnce(aliasConflictError)
                .mockResolvedValueOnce({
                    ...mockCampaign,
                    clTrueId: 202,
                    clFalseId: 303,
                })
                .mockResolvedValueOnce({
                    ...mockCampaign,
                    orgFalseId: 789,
                });
            keitaroService.createCLOCampaignStreams.mockResolvedValue({
                clTrueId: 202,
                clFalseId: 303,
            });
            keitaroService.createORGCampaignStreams.mockResolvedValue({
                orgFalseId: 789,
            });

            const result = await service.createApp(createAppDto);

            expect(result).toBeDefined();
            expect(keitaroService.createCampaign).toHaveBeenCalledTimes(3);
        });
    });

    describe("copyCampaign", () => {
        const copyCampaignDto: CopyCampaignDto = {
            id: 1,
            group_id: 2,
            name: "Copied Campaign",
            sub_id: "sub123",
            change_parameters: true,
        };

        it("should copy campaign successfully", async () => {
            keitaroService.copyCampaign.mockResolvedValue([mockCampaign]);
            keitaroService.updateCampaign.mockResolvedValue(mockCopiedCampaign);

            const result = await service.copyCampaign(copyCampaignDto);

            expect(keitaroService.copyCampaign).toHaveBeenCalledWith(
                copyCampaignDto.id,
            );
            expect(keitaroService.updateCampaign).toHaveBeenCalled();
            expect(result).toEqual(mockCopiedCampaign);
        });

        it("should throw BadRequestException for missing required fields", async () => {
            const invalidDto = {
                id: 0,
                group_id: 0,
                name: "",
            } as CopyCampaignDto;

            await expect(service.copyCampaign(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
        });
    });

    describe("createByOffer", () => {
        const createByOfferDto: CreateByOfferDto = {
            offer_id: "123",
        };

        it("should create by offer successfully", async () => {
            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.createCampaign.mockResolvedValue(mockCampaign);
            keitaroService.createStream.mockResolvedValue(mockStream);

            const result = await service.createByOffer(createByOfferDto);

            expect(result).toBeDefined();
            expect((result as any).name).toBe(mockOffer.name);
            expect(keitaroService.getOfferById).toHaveBeenCalledWith(123);
            expect(keitaroService.createCampaign).toHaveBeenCalled();
            expect(keitaroService.createStream).toHaveBeenCalled();
        });

        it("should throw BadRequestException for missing offer_id", async () => {
            const invalidDto = {
                offer_id: "",
            } as CreateByOfferDto;

            await expect(service.createByOffer(invalidDto)).rejects.toThrow(
                BadRequestException,
            );
        });

        it("should handle alias conflict and retry", async () => {
            const aliasConflictError = {
                response: {
                    data: {
                        alias: ["Alias already exists"],
                    },
                },
            };

            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.createCampaign
                .mockRejectedValueOnce(aliasConflictError)
                .mockResolvedValueOnce(mockCampaign);
            keitaroService.createStream.mockResolvedValue(mockStream);

            const result = await service.createByOffer(createByOfferDto);

            expect(result).toBeDefined();
        });
    });

    describe("createOnelinkCampaign", () => {
        const createOnelinkCampaignDto: CreateOnelinkCampaignDto = {
            offer_id: "123",
            bundle_id: "com.test.app",
            app_name: "Test App",
        };

        it("should create onelink campaign successfully", async () => {
            keitaroService.getAllCampaigns.mockResolvedValue([]);
            keitaroService.createCampaign.mockResolvedValue(mockCampaign);
            keitaroService.getCampaignStreams.mockResolvedValue([]);
            keitaroService.createStream.mockResolvedValue(mockStream);

            const result = await service.createOnelinkCampaign(
                createOnelinkCampaignDto,
            );

            expect(result).toBeDefined();
            expect((result as any).id).toBe(mockCampaign.id);
            expect(keitaroService.createCampaign).toHaveBeenCalled();
            expect(keitaroService.createStream).toHaveBeenCalled();
        });

        it("should throw BadRequestException for missing required fields", async () => {
            const invalidDto = {
                offer_id: "",
                bundle_id: "",
                app_name: "",
            } as CreateOnelinkCampaignDto;

            await expect(
                service.createOnelinkCampaign(invalidDto),
            ).rejects.toThrow(BadRequestException);
        });

        it("should handle alias conflict and retry", async () => {
            const aliasConflictError = {
                response: {
                    data: {
                        alias: ["Alias already exists"],
                    },
                },
            };

            keitaroService.getAllCampaigns.mockResolvedValue([]);
            keitaroService.createCampaign
                .mockRejectedValueOnce(aliasConflictError)
                .mockResolvedValueOnce(mockCampaign);
            keitaroService.getCampaignStreams.mockResolvedValue([]);
            keitaroService.createStream.mockResolvedValue(mockStream);

            const result = await service.createOnelinkCampaign(
                createOnelinkCampaignDto,
            );

            expect(result).toBeDefined();
            expect((result as any).id).toBe(mockCampaign.id);
            expect(keitaroService.createCampaign).toHaveBeenCalledTimes(2);
        });

        it("should handle duplicate alias error", async () => {
            const duplicateAliasError = {
                response: {
                    status: 400,
                    data: {
                        alias: ["Alias already exists"],
                    },
                },
            };

            keitaroService.getAllCampaigns.mockResolvedValue([]);
            keitaroService.createCampaign
                .mockRejectedValueOnce(duplicateAliasError)
                .mockResolvedValueOnce(mockCampaign);
            keitaroService.getCampaignStreams.mockResolvedValue([]);
            keitaroService.createStream.mockResolvedValue(mockStream);

            const result = await service.createOnelinkCampaign(
                createOnelinkCampaignDto,
            );

            expect(result).toBeDefined();
            expect((result as any).id).toBe(mockCampaign.id);
            expect(keitaroService.createCampaign).toHaveBeenCalledTimes(2);
        });
    });
});
