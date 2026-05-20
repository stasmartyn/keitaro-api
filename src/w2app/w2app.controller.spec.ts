import { Test, TestingModule } from "@nestjs/testing";

import { W2appController } from "./w2app.controller";
import { W2appService } from "./w2app.service";

describe("W2appController", () => {
    let controller: W2appController;
    let service: jest.Mocked<W2appService>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [W2appController],
            providers: [
                {
                    provide: W2appService,
                    useValue: {
                        createSplitCampaign: jest.fn(),
                        updateSplitCampaign: jest.fn(),
                        getSplitCampaignState: jest.fn(),
                        disableSplitCampaign: jest.fn(),
                        banAppInSplit: jest.fn(),
                        unbanAppInSplit: jest.fn(),
                        createNamingCampaign: jest.fn(),
                        updateNamingCampaign: jest.fn(),
                        disableNamingCampaign: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<W2appController>(W2appController);
        service = module.get(W2appService);
    });

    it("createSplitCampaign делегує виклик сервісу", async () => {
        service.createSplitCampaign.mockResolvedValue({
            campaignId: 1,
            campaignToken: "token",
            campaignAlias: "alias",
            streamIds: [],
            defaultStreamId: 10,
        });

        const body = {
            campaignName: "Split Test",
            campaignType: "weight" as const,
            uniquenessMethod: "ip_ua" as const,
            cookiesTtlHours: 24,
            bindVisitors: "slo" as const,
            apps: [
                {
                    appId: "6fa58db8-ddf3-4990-a0bb-57f4974e7eec",
                    offerId: 10,
                    weight: 100,
                    streamName: "App",
                },
            ],
            parameters: {},
            defaultStream: { fallbackCampaignId: 132 },
        };

        const result = await controller.createSplitCampaign(body);
        expect(service.createSplitCampaign).toHaveBeenCalledWith(body);
        expect(result.campaignId).toBe(1);
    });
});
