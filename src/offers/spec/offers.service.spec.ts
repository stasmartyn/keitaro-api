import { Test, TestingModule } from "@nestjs/testing";
import { OffersService } from "../offers.service";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

describe("OffersService", () => {
    let service: OffersService;
    let keitaroService: jest.Mocked<KeitaroService>;

    beforeEach(async () => {
        const mockKeitaroService = {
            getOffers: jest.fn(),
            getAllCampaigns: jest.fn(),
            createCampaign: jest.fn(),
            updateCampaign: jest.fn(),
            deleteResource: jest.fn(),
            getAffiliateNetworkById: jest.fn(),
            createOffer: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OffersService,
                {
                    provide: KeitaroService,
                    useValue: mockKeitaroService,
                },
            ],
        }).compile();

        service = module.get<OffersService>(OffersService);
        keitaroService = module.get(KeitaroService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("getOffers", () => {
        it("should return all offers successfully", async () => {
            const mockOffers = [
                { id: 1, name: "Offer 1" },
                { id: 2, name: "Offer 2" },
            ];

            keitaroService.getOffers.mockResolvedValue(mockOffers);

            const result = await service.getOffers();

            expect(result).toEqual(mockOffers);
            expect(keitaroService.getOffers).toHaveBeenCalled();
        });

        it("should handle Keitaro service error", async () => {
            const error = new Error("Keitaro API error");
            keitaroService.getOffers.mockRejectedValue(error);

            await expect(service.getOffers()).rejects.toThrow();
        });
    });
});
