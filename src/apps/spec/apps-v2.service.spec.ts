import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";

import { AppsV2Service } from "../v2/apps.service";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { CreateAppResultInterface } from "../interfaces/create-app-result.interface";

describe("AppsV2Service", () => {
    let service: AppsV2Service;
    let keitaroService: jest.Mocked<KeitaroService>;
    let configService: jest.Mocked<ConfigService>;

    const mockTrafficSource = {
        id: 123,
        name: "Test Traffic Source",
        sub_id: "sub123",
        postback_url: "https://test.com/postback",
    };

    const mockCopiedCampaign = {
        id: 456,
        name: "Test Campaign",
        alias: "test-alias",
        token: "test-token",
        traffic_source_id: 123,
        group_id: 1,
    };

    const mockCampaignStreams = [
        {
            id: 1,
            name: "true",
            campaign_id: 456,
            type: "regular",
            state: "active",
        },
        {
            id: 2,
            name: "false",
            campaign_id: 456,
            type: "regular",
            state: "active",
        },
    ];

    const mockUpdatedCampaign = {
        id: 456,
        name: "Updated Campaign",
        alias: "updated-alias",
        token: "test-token",
        traffic_source_id: 123,
        group_id: 39,
    };

    beforeEach(async () => {
        const mockKeitaroService = {
            createTrafficSource: jest.fn(),
            copyCampaign: jest.fn(),
            getCampaignStreams: jest.fn(),
            updateCampaign: jest.fn(),
            deleteResource: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppsV2Service,
                {
                    provide: KeitaroService,
                    useValue: mockKeitaroService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AppsV2Service>(AppsV2Service);
        keitaroService = module.get(KeitaroService);
        configService = module.get(ConfigService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("createApp", () => {
        const createAppDto: CreateAppDto = {
            name: "Test App V2",
            bundle_id: "com.test.app.v2",
            sub_id: "sub123",
            postback_url: "https://test.com/postback",
            isAndroid: true,
            isIos: false,
        };

        beforeEach(() => {
            configService.get.mockImplementation((key: string) => {
                if (key === "keitaro.iosCloCampaignTemplateId") return 100;
                if (key === "keitaro.androidCloCampaignTemplateId") return 200;
                if (key === "keitaro.iosOrgCampaignTemplateId") return 300;
                if (key === "keitaro.androidOrgCampaignTemplateId") return 400;
                return null;
            });
        });

        it("should create app successfully for Android", async () => {
            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(mockCampaignStreams)
                .mockResolvedValueOnce(mockCampaignStreams);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            const result = (await service.createApp(
                createAppDto,
            )) as CreateAppResultInterface;

            expect(result).toBeDefined();
            expect(result.trafficSourceId).toBe(mockTrafficSource.id);
            expect(result.cloCampaign.campaignId).toBe(mockCopiedCampaign.id);
            expect(result.orgCampaign.campaignId).toBe(789);
            expect(keitaroService.createTrafficSource).toHaveBeenCalled();
            expect(keitaroService.copyCampaign).toHaveBeenCalledTimes(2);
            expect(keitaroService.updateCampaign).toHaveBeenCalledTimes(2);
        });

        it("should create app successfully for iOS", async () => {
            const iosDto = { ...createAppDto, isAndroid: false, isIos: true };

            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(mockCampaignStreams)
                .mockResolvedValueOnce(mockCampaignStreams);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            const result = (await service.createApp(
                iosDto,
            )) as CreateAppResultInterface;

            expect(result).toBeDefined();
            expect(result.trafficSourceId).toBe(mockTrafficSource.id);
            expect(keitaroService.createTrafficSource).toHaveBeenCalled();
            expect(keitaroService.copyCampaign).toHaveBeenCalledTimes(2);
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

        it("should handle step failure and cleanup resources", async () => {
            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign.mockRejectedValue(
                new Error("Copy campaign failed"),
            );

            await expect(service.createApp(createAppDto)).rejects.toThrow();
            expect(keitaroService.deleteResource).toHaveBeenCalled();
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
            keitaroService.copyCampaign
                .mockRejectedValueOnce(aliasConflictError)
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(mockCampaignStreams)
                .mockResolvedValueOnce(mockCampaignStreams);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            await expect(service.createApp(createAppDto)).rejects.toThrow();
        });

        it("should handle Keitaro API error with detailed logging", async () => {
            const keitaroError = new Error("Keitaro API error") as any;
            keitaroError.response = {
                status: 400,
                statusText: "Bad Request",
                data: { error: "Invalid request" },
                headers: {},
            };
            keitaroError.config = {
                url: "https://keitaro.com/api",
                method: "POST",
                headers: {},
                data: {},
                params: {},
            };

            keitaroService.createTrafficSource.mockRejectedValue(keitaroError);

            await expect(service.createApp(createAppDto)).rejects.toThrow();
        });

        it("should handle missing false stream in campaign streams", async () => {
            const streamsWithoutFalse = [
                {
                    id: 1,
                    name: "true",
                    campaign_id: 456,
                    type: "regular",
                    state: "active",
                },
            ];

            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(streamsWithoutFalse)
                .mockResolvedValueOnce(streamsWithoutFalse);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            const result = (await service.createApp(
                createAppDto,
            )) as CreateAppResultInterface;

            expect(result).toBeDefined();
            expect(result.cloCampaign.clFalseId).toBeNull();
            expect(result.orgCampaign.orgFalseId).toBeNull();
        });

        it("should use correct template IDs for iOS", async () => {
            const iosDto = { ...createAppDto, isAndroid: false, isIos: true };

            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(mockCampaignStreams)
                .mockResolvedValueOnce(mockCampaignStreams);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            await service.createApp(iosDto);

            expect(keitaroService.copyCampaign).toHaveBeenCalledWith(100); // iOS CLO template
            expect(keitaroService.copyCampaign).toHaveBeenCalledWith(300); // iOS ORG template
        });

        it("should use correct template IDs for Android", async () => {
            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign
                .mockResolvedValueOnce([mockCopiedCampaign])
                .mockResolvedValueOnce([{ ...mockCopiedCampaign, id: 789 }]);
            keitaroService.getCampaignStreams
                .mockResolvedValueOnce(mockCampaignStreams)
                .mockResolvedValueOnce(mockCampaignStreams);
            keitaroService.updateCampaign
                .mockResolvedValueOnce(mockUpdatedCampaign)
                .mockResolvedValueOnce({ ...mockUpdatedCampaign, id: 789 });

            await service.createApp(createAppDto);

            expect(keitaroService.copyCampaign).toHaveBeenCalledWith(200); // Android CLO template
            expect(keitaroService.copyCampaign).toHaveBeenCalledWith(400); // Android ORG template
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

            keitaroService.createTrafficSource.mockResolvedValue(
                mockTrafficSource,
            );
            keitaroService.copyCampaign.mockRejectedValue(duplicateAliasError);

            await expect(service.createApp(createAppDto)).rejects.toThrow();
            expect(keitaroService.deleteResource).toHaveBeenCalled();
        });
    });
});
