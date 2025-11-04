import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { OffersService } from "../offers.service";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { Logger } from "../../utils/logger";
import { EnableCloakDto } from "../dto/enable-cloak.dto";
import { EnableGraySectionDto } from "../dto/enable-gray-section.dto";

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
            getOfferById: jest.fn(),
            updateOffer: jest.fn(),
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

    describe("enableCloaking", () => {
        it("should enable cloaking for existing offer", async () => {
            const enableCloakDto: EnableCloakDto = {
                offerId: 12345,
                enableCloaking: true,
            };

            const mockOffer = { id: 12345, name: "Test Offer" };
            const mockUpdatedOffer = {
                id: 12345,
                name: "Test Offer",
                cloaking_enabled: true,
            };

            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.updateOffer.mockResolvedValue(mockUpdatedOffer);

            const result = await service.enableCloaking(enableCloakDto);

            expect(keitaroService.getOfferById).toHaveBeenCalledWith(12345);
            expect(keitaroService.updateOffer).toHaveBeenCalledWith(12345, {
                cloaking_enabled: true,
            });
            expect(result).toEqual({
                success: true,
                message: "Cloaking enabled for offer 12345",
                data: mockUpdatedOffer,
            });
        });

        it("should disable cloaking for existing offer", async () => {
            const enableCloakDto: EnableCloakDto = {
                offerId: 12345,
                enableCloaking: false,
            };

            const mockOffer = { id: 12345, name: "Test Offer" };
            const mockUpdatedOffer = {
                id: 12345,
                name: "Test Offer",
                cloaking_enabled: false,
            };

            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.updateOffer.mockResolvedValue(mockUpdatedOffer);

            const result = await service.enableCloaking(enableCloakDto);

            expect(result).toEqual({
                success: true,
                message: "Cloaking disabled for offer 12345",
                data: mockUpdatedOffer,
            });
        });

        it("should throw BadRequestException when offer not found", async () => {
            const enableCloakDto: EnableCloakDto = {
                offerId: 99999,
                enableCloaking: true,
            };

            keitaroService.getOfferById.mockResolvedValue(null);

            await expect(
                service.enableCloaking(enableCloakDto),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.enableCloaking(enableCloakDto),
            ).rejects.toThrow("Offer with ID 99999 not found");
        });
    });

    describe("enableGraySection", () => {
        it("should enable gray section for existing offer", async () => {
            const enableGraySectionDto: EnableGraySectionDto = {
                offerId: 12345,
                enableGraySection: true,
            };

            const mockOffer = { id: 12345, name: "Test Offer" };
            const mockUpdatedOffer = {
                id: 12345,
                name: "Test Offer",
                gray_section_enabled: true,
            };

            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.updateOffer.mockResolvedValue(mockUpdatedOffer);

            const result =
                await service.enableGraySection(enableGraySectionDto);

            expect(keitaroService.getOfferById).toHaveBeenCalledWith(12345);
            expect(keitaroService.updateOffer).toHaveBeenCalledWith(12345, {
                gray_section_enabled: true,
            });
            expect(result).toEqual({
                success: true,
                message: "Gray section enabled for offer 12345",
                data: mockUpdatedOffer,
            });
        });

        it("should disable gray section for existing offer", async () => {
            const enableGraySectionDto: EnableGraySectionDto = {
                offerId: 12345,
                enableGraySection: false,
            };

            const mockOffer = { id: 12345, name: "Test Offer" };
            const mockUpdatedOffer = {
                id: 12345,
                name: "Test Offer",
                gray_section_enabled: false,
            };

            keitaroService.getOfferById.mockResolvedValue(mockOffer);
            keitaroService.updateOffer.mockResolvedValue(mockUpdatedOffer);

            const result =
                await service.enableGraySection(enableGraySectionDto);

            expect(result).toEqual({
                success: true,
                message: "Gray section disabled for offer 12345",
                data: mockUpdatedOffer,
            });
        });

        it("should throw BadRequestException when offer not found", async () => {
            const enableGraySectionDto: EnableGraySectionDto = {
                offerId: 99999,
                enableGraySection: true,
            };

            keitaroService.getOfferById.mockResolvedValue(null);

            await expect(
                service.enableGraySection(enableGraySectionDto),
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.enableGraySection(enableGraySectionDto),
            ).rejects.toThrow("Offer with ID 99999 not found");
        });
    });
});
