import { Test, TestingModule } from "@nestjs/testing";
import { AppsV2Controller } from "../v2/apps.controller";
import { AppsV2Service } from "../v2/apps.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";

describe("AppsV2Controller", () => {
    let controller: AppsV2Controller;
    let appsV2Service: AppsV2Service;

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

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AppsV2Controller],
            providers: [
                {
                    provide: AppsV2Service,
                    useValue: {
                        createApp: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<AppsV2Controller>(AppsV2Controller);
        appsV2Service = module.get<AppsV2Service>(AppsV2Service);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("POST /v2/apps/create-campaign", () => {
        const createAppDto: CreateAppDto = {
            name: "Test App V2",
            bundle_id: "com.test.app.v2",
            sub_id: "sub123",
            postback_url: "https://test.com/postback",
            isAndroid: true,
            isIos: false,
        };

        it("should create app successfully", async () => {
            jest.spyOn(appsV2Service, "createApp").mockResolvedValue(
                mockCreateAppResult,
            );

            const result = await controller.createApp(createAppDto);

            expect(appsV2Service.createApp).toHaveBeenCalledWith(createAppDto);
            expect(result).toEqual(mockCreateAppResult);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(appsV2Service, "createApp").mockRejectedValue(
                validationError,
            );

            await expect(controller.createApp(createAppDto)).rejects.toThrow();
            expect(appsV2Service.createApp).toHaveBeenCalledWith(createAppDto);
        });

        it("should handle service error", async () => {
            const serviceError = new Error("Service error");
            jest.spyOn(appsV2Service, "createApp").mockRejectedValue(
                serviceError,
            );

            await expect(controller.createApp(createAppDto)).rejects.toThrow();
            expect(appsV2Service.createApp).toHaveBeenCalledWith(createAppDto);
        });

        it("should handle missing required fields", async () => {
            const invalidDto = {
                name: "Test App",
                bundle_id: "com.test.app",
                // missing required fields
            } as CreateAppDto;

            const validationError = new Error("Missing required fields");
            jest.spyOn(appsV2Service, "createApp").mockRejectedValue(
                validationError,
            );

            await expect(controller.createApp(invalidDto)).rejects.toThrow();
            expect(appsV2Service.createApp).toHaveBeenCalledWith(invalidDto);
        });

        it("should handle Keitaro API error", async () => {
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(appsV2Service, "createApp").mockRejectedValue(
                keitaroError,
            );

            await expect(controller.createApp(createAppDto)).rejects.toThrow();
            expect(appsV2Service.createApp).toHaveBeenCalledWith(createAppDto);
        });
    });
});
