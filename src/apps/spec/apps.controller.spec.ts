import { Test, TestingModule } from "@nestjs/testing";
import { AppsController } from "../v1/apps.controller";
import { AppsService } from "../v1/apps.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { CopyCampaignDto } from "../dto/copy-campaign.dto";
import { CreateByOfferDto } from "../dto/create-by-offer.dto";
import { CreateOnelinkCampaignDto } from "../dto/create-onelink.campaign.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

describe("AppsController", () => {
    let controller: AppsController;
    let appsService: AppsService;

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

    const mockByOfferResult = {
        name: "Test Offer",
        alias: "offer-alias",
        user_id: "user123",
    };

    const mockOnelinkResult = {
        id: 789,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppsController],
            providers: [
                {
                    provide: AppsService,
                    useValue: {
                        getAllCampaigns: jest.fn(),
                        createApp: jest.fn(),
                        copyCampaign: jest.fn(),
                        createNoOrgCampaign: jest.fn(),
                        createByOffer: jest.fn(),
                        createOnelinkCampaign: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppsController>(AppsController);
        appsService = module.get<AppsService>(AppsService);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("GET /v1/apps/all-campaigns", () => {
        it("should return all campaigns successfully", async () => {
            jest.spyOn(appsService, "getAllCampaigns").mockResolvedValue(
                mockCampaigns,
            );

            const result = await controller.getAllCampaigns();

            expect(appsService.getAllCampaigns).toHaveBeenCalled();
            expect(result).toEqual(mockCampaigns);
        });

        it("should return empty array when no campaigns exist", async () => {
            jest.spyOn(appsService, "getAllCampaigns").mockResolvedValue([]);

            const result = await controller.getAllCampaigns();

            expect(appsService.getAllCampaigns).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it("should handle service error", async () => {
            const error = new Error("Service error");
            jest.spyOn(appsService, "getAllCampaigns").mockRejectedValue(error);

            await expect(controller.getAllCampaigns()).rejects.toThrow();
            expect(appsService.getAllCampaigns).toHaveBeenCalled();
        });
    });

    describe("POST /v1/apps/create-campaign", () => {
        const createAppDto: CreateAppDto = {
            name: "Test App",
            bundle_id: "com.test.app",
            sub_id: "sub123",
            postback_url: "https://test.com/postback",
            isAndroid: true,
            isIos: false,
            campaign_id: 123,
        };

        it("should create app successfully", async () => {
            jest.spyOn(appsService, "createApp").mockResolvedValue(
                mockCreateAppResult,
            );

            const result = await controller.createApp(createAppDto);

            expect(appsService.createApp).toHaveBeenCalledWith(createAppDto);
            expect(result).toEqual(mockCreateAppResult);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(appsService, "createApp").mockRejectedValue(
                validationError,
            );

            await expect(controller.createApp(createAppDto)).rejects.toThrow();
            expect(appsService.createApp).toHaveBeenCalledWith(createAppDto);
        });

        it("should handle service error", async () => {
            const serviceError = new Error("Service error");
            jest.spyOn(appsService, "createApp").mockRejectedValue(
                serviceError,
            );

            await expect(controller.createApp(createAppDto)).rejects.toThrow();
            expect(appsService.createApp).toHaveBeenCalledWith(createAppDto);
        });
    });

    describe("POST /v1/apps/copy-campaign", () => {
        const copyCampaignDto: CopyCampaignDto = {
            id: 1,
            group_id: 2,
            name: "Copied Campaign",
            sub_id: "sub123",
            change_parameters: true,
        };

        it("should copy campaign successfully", async () => {
            jest.spyOn(appsService, "copyCampaign").mockResolvedValue(
                mockCopiedCampaign,
            );

            const result = await controller.copyCampaign(copyCampaignDto);

            expect(appsService.copyCampaign).toHaveBeenCalledWith(
                copyCampaignDto,
            );
            expect(result).toEqual(mockCopiedCampaign);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(appsService, "copyCampaign").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.copyCampaign(copyCampaignDto),
            ).rejects.toThrow();
            expect(appsService.copyCampaign).toHaveBeenCalledWith(
                copyCampaignDto,
            );
        });

        it("should handle service error", async () => {
            const serviceError = new Error("Service error");
            jest.spyOn(appsService, "copyCampaign").mockRejectedValue(
                serviceError,
            );

            await expect(
                controller.copyCampaign(copyCampaignDto),
            ).rejects.toThrow();
            expect(appsService.copyCampaign).toHaveBeenCalledWith(
                copyCampaignDto,
            );
        });
    });

    describe("POST /v1/apps/create-by-offer", () => {
        const createByOfferDto: CreateByOfferDto = {
            offer_id: "123",
        };

        it("should create by offer successfully", async () => {
            jest.spyOn(appsService, "createByOffer").mockResolvedValue(
                mockByOfferResult,
            );

            const result = await controller.createByOffer(createByOfferDto);

            expect(appsService.createByOffer).toHaveBeenCalledWith(
                createByOfferDto,
            );
            expect(result).toEqual(mockByOfferResult);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(appsService, "createByOffer").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.createByOffer(createByOfferDto),
            ).rejects.toThrow();
            expect(appsService.createByOffer).toHaveBeenCalledWith(
                createByOfferDto,
            );
        });

        it("should handle service error", async () => {
            const serviceError = new Error("Service error");
            jest.spyOn(appsService, "createByOffer").mockRejectedValue(
                serviceError,
            );

            await expect(
                controller.createByOffer(createByOfferDto),
            ).rejects.toThrow();
            expect(appsService.createByOffer).toHaveBeenCalledWith(
                createByOfferDto,
            );
        });
    });

    describe("POST /v1/apps/create-onelink-campaign", () => {
        const createOnelinkCampaignDto: CreateOnelinkCampaignDto = {
            offer_id: "123",
            bundle_id: "com.test.app",
            app_name: "Test App",
        };

        it("should create onelink campaign successfully", async () => {
            jest.spyOn(appsService, "createOnelinkCampaign").mockResolvedValue(
                mockOnelinkResult,
            );

            const result = await controller.createOnelinkCampaign(
                createOnelinkCampaignDto,
            );

            expect(appsService.createOnelinkCampaign).toHaveBeenCalledWith(
                createOnelinkCampaignDto,
            );
            expect(result).toEqual(mockOnelinkResult);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(appsService, "createOnelinkCampaign").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.createOnelinkCampaign(createOnelinkCampaignDto),
            ).rejects.toThrow();
            expect(appsService.createOnelinkCampaign).toHaveBeenCalledWith(
                createOnelinkCampaignDto,
            );
        });

        it("should handle service error", async () => {
            const serviceError = new Error("Service error");
            jest.spyOn(appsService, "createOnelinkCampaign").mockRejectedValue(
                serviceError,
            );

            await expect(
                controller.createOnelinkCampaign(createOnelinkCampaignDto),
            ).rejects.toThrow();
            expect(appsService.createOnelinkCampaign).toHaveBeenCalledWith(
                createOnelinkCampaignDto,
            );
        });
    });
});
