import { Test, TestingModule } from "@nestjs/testing";
import { OffersController } from "../offers.controller";
import { OffersService } from "../offers.service";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

describe("OffersController", () => {
    let controller: OffersController;
    let offersService: OffersService;

    const mockOffers = [
        {
            id: 1,
            name: "Test Offer 1",
            affiliate_network_id: 1,
            payout_value: 10.5,
            payout_currency: "USD",
            country: ["US", "CA"],
            notes: "Test offer 1",
            state: "active",
        },
        {
            id: 2,
            name: "Test Offer 2",
            affiliate_network_id: 2,
            payout_value: 15.0,
            payout_currency: "EUR",
            country: ["DE", "FR"],
            notes: "Test offer 2",
            state: "active",
        },
    ];

    const mockCreatedOffer = {
        id: 3,
        name: "New Test Offer",
        affiliate_network_id: 1,
        payout_value: 20.0,
        payout_currency: "USD",
        country: ["US"],
        notes: "New test offer",
        state: "active",
    };

    const mockSingleOffer = {
        id: 4,
        app_name: "Test App",
        bundle_id: "com.test.app",
        attribution_type: "firebase",
        attribution_link: "https://test.com",
        state: "active",
    };

    const mockAppLinkOffer = {
        id: 5,
        group_id: "1",
        name: "Test App Link",
        link: "https://test.com/app",
        service_template_id: "1",
        state: "active",
    };

    const mockNewPartner = {
        id: 6,
        partnerName: "Test Partner",
        mail: "test@partner.com",
        urlParams: "param1=value1",
        state: "active",
    };

    const mockUpdatedOffer = {
        id: 1,
        name: "Updated Test Offer",
        affiliate_network_id: 1,
        payout_value: 25.0,
        payout_currency: "USD",
        country: ["US", "CA"],
        notes: "Updated test offer",
        state: "active",
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OffersController],
            providers: [
                {
                    provide: OffersService,
                    useValue: {
                        getOffers: jest.fn(),
                        createOffer: jest.fn(),
                        createSingleOffer: jest.fn(),
                        createSingleOfferAppLink: jest.fn(),
                        createNewPartner: jest.fn(),
                        updateOffer: jest.fn(),
                        enableCloaking: jest.fn(),
                        enableGraySection: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<OffersController>(OffersController);
        offersService = module.get<OffersService>(OffersService);
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("GET /offers", () => {
        it("should return all offers successfully", async () => {
            jest.spyOn(offersService, "getOffers").mockResolvedValue(
                mockOffers,
            );

            const result = await controller.getOffers();

            expect(offersService.getOffers).toHaveBeenCalled();
            expect(result).toEqual(mockOffers);
        });

        it("should return empty array when no offers exist", async () => {
            jest.spyOn(offersService, "getOffers").mockResolvedValue([]);

            const result = await controller.getOffers();

            expect(offersService.getOffers).toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it("should handle Keitaro service error", async () => {
            const error = new Error("Keitaro API error");
            jest.spyOn(offersService, "getOffers").mockRejectedValue(error);

            await expect(controller.getOffers()).rejects.toThrow();
            expect(offersService.getOffers).toHaveBeenCalled();
        });

        it("should handle network timeout", async () => {
            const timeoutError = new Error("Request timeout");
            jest.spyOn(offersService, "getOffers").mockRejectedValue(
                timeoutError,
            );

            await expect(controller.getOffers()).rejects.toThrow();
            expect(offersService.getOffers).toHaveBeenCalled();
        });
    });

    describe("POST /offers/create/multiple", () => {
        const createMultipleOffersDto = {
            sources: ["source1", "source2"],
            name: "New Test Offer",
            affiliate_network_id: 1,
            payout_value: 20.0,
            payout_currency: "USD",
            country: ["US"],
            notes: "New test offer",
            payout_auto: null,
            lands: { offer: "test-offer" },
        };

        it("should create multiple offers successfully", async () => {
            jest.spyOn(offersService, "createOffer").mockResolvedValue(
                mockCreatedOffer,
            );

            const result = await controller.createMultipleOffers(
                createMultipleOffersDto,
            );

            expect(offersService.createOffer).toHaveBeenCalledWith(
                createMultipleOffersDto,
            );
            expect(result).toEqual(mockCreatedOffer);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(offersService, "createOffer").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.createMultipleOffers(createMultipleOffersDto),
            ).rejects.toThrow();
            expect(offersService.createOffer).toHaveBeenCalledWith(
                createMultipleOffersDto,
            );
        });

        it("should handle Keitaro service error", async () => {
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(offersService, "createOffer").mockRejectedValue(
                keitaroError,
            );

            await expect(
                controller.createMultipleOffers(createMultipleOffersDto),
            ).rejects.toThrow();
            expect(offersService.createOffer).toHaveBeenCalledWith(
                createMultipleOffersDto,
            );
        });
    });

    describe("POST /offers/create/single", () => {
        const createSingleOfferDto = {
            app_name: "Test App",
            bundle_id: "com.test.app",
            attribution_type: "firebase",
            attribution_link: "https://test.com",
            offer_group_id: 10,
            affiliate_network_id: 596,
        };

        it("should create single offer successfully", async () => {
            jest.spyOn(offersService, "createSingleOffer").mockResolvedValue(
                mockSingleOffer,
            );

            const result =
                await controller.createSingleOffer(createSingleOfferDto);

            expect(offersService.createSingleOffer).toHaveBeenCalledWith(
                createSingleOfferDto,
            );
            expect(result).toEqual(mockSingleOffer);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(offersService, "createSingleOffer").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.createSingleOffer(createSingleOfferDto),
            ).rejects.toThrow();
            expect(offersService.createSingleOffer).toHaveBeenCalledWith(
                createSingleOfferDto,
            );
        });

        it("should handle Keitaro service error", async () => {
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(offersService, "createSingleOffer").mockRejectedValue(
                keitaroError,
            );

            await expect(
                controller.createSingleOffer(createSingleOfferDto),
            ).rejects.toThrow();
            expect(offersService.createSingleOffer).toHaveBeenCalledWith(
                createSingleOfferDto,
            );
        });
    });

    describe("POST /offers/create/single/app-link", () => {
        const createSingleOfferAppLinkDto = {
            group_id: "1",
            name: "Test App Link",
            link: "https://test.com/app",
            service_template_id: "1",
        };

        it("should create single offer app link successfully", async () => {
            jest.spyOn(
                offersService,
                "createSingleOfferAppLink",
            ).mockResolvedValue(mockAppLinkOffer);

            const result = await controller.createSingleOfferAppLink(
                createSingleOfferAppLinkDto,
            );

            expect(offersService.createSingleOfferAppLink).toHaveBeenCalledWith(
                createSingleOfferAppLinkDto,
            );
            expect(result).toEqual(mockAppLinkOffer);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(
                offersService,
                "createSingleOfferAppLink",
            ).mockRejectedValue(validationError);

            await expect(
                controller.createSingleOfferAppLink(
                    createSingleOfferAppLinkDto,
                ),
            ).rejects.toThrow();
            expect(offersService.createSingleOfferAppLink).toHaveBeenCalledWith(
                createSingleOfferAppLinkDto,
            );
        });

        it("should handle Keitaro service error", async () => {
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(
                offersService,
                "createSingleOfferAppLink",
            ).mockRejectedValue(keitaroError);

            await expect(
                controller.createSingleOfferAppLink(
                    createSingleOfferAppLinkDto,
                ),
            ).rejects.toThrow();
            expect(offersService.createSingleOfferAppLink).toHaveBeenCalledWith(
                createSingleOfferAppLinkDto,
            );
        });
    });

    describe("POST /offers/create/new-partner", () => {
        const createNewPartnerDto = {
            partnerName: "Test Partner",
            mail: "test@partner.com",
            urlParams: "param1=value1",
            testLink: "https://test.com",
            testLinkGeo: "https://test.com/geo",
        };

        it("should create new partner successfully", async () => {
            jest.spyOn(offersService, "createNewPartner").mockResolvedValue(
                mockNewPartner,
            );

            const result =
                await controller.createNewPartner(createNewPartnerDto);

            expect(offersService.createNewPartner).toHaveBeenCalledWith(
                createNewPartnerDto,
            );
            expect(result).toEqual(mockNewPartner);
        });

        it("should handle validation error", async () => {
            const validationError = new Error("Validation failed");
            jest.spyOn(offersService, "createNewPartner").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.createNewPartner(createNewPartnerDto),
            ).rejects.toThrow();
            expect(offersService.createNewPartner).toHaveBeenCalledWith(
                createNewPartnerDto,
            );
        });

        it("should handle Keitaro service error", async () => {
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(offersService, "createNewPartner").mockRejectedValue(
                keitaroError,
            );

            await expect(
                controller.createNewPartner(createNewPartnerDto),
            ).rejects.toThrow();
            expect(offersService.createNewPartner).toHaveBeenCalledWith(
                createNewPartnerDto,
            );
        });
    });

    describe("PATCH /offers/update/:id", () => {
        const updateData = {
            name: "Updated Test Offer",
            payout_value: 25.0,
        };

        it("should update offer successfully", async () => {
            const offerId = "1";
            jest.spyOn(offersService, "updateOffer").mockResolvedValue(
                mockUpdatedOffer,
            );

            const result = await controller.updateOffer(offerId, updateData);

            expect(offersService.updateOffer).toHaveBeenCalledWith(
                offerId,
                updateData,
            );
            expect(result).toEqual(mockUpdatedOffer);
        });

        it("should handle offer not found", async () => {
            const offerId = "999";
            const notFoundError = new Error("Offer not found");
            jest.spyOn(offersService, "updateOffer").mockRejectedValue(
                notFoundError,
            );

            await expect(
                controller.updateOffer(offerId, updateData),
            ).rejects.toThrow();
            expect(offersService.updateOffer).toHaveBeenCalledWith(
                offerId,
                updateData,
            );
        });

        it("should handle validation error", async () => {
            const offerId = "1";
            const validationError = new Error("Validation failed");
            jest.spyOn(offersService, "updateOffer").mockRejectedValue(
                validationError,
            );

            await expect(
                controller.updateOffer(offerId, updateData),
            ).rejects.toThrow();
            expect(offersService.updateOffer).toHaveBeenCalledWith(
                offerId,
                updateData,
            );
        });

        it("should handle Keitaro service error", async () => {
            const offerId = "1";
            const keitaroError = new Error("Keitaro API error");
            jest.spyOn(offersService, "updateOffer").mockRejectedValue(
                keitaroError,
            );

            await expect(
                controller.updateOffer(offerId, updateData),
            ).rejects.toThrow();
            expect(offersService.updateOffer).toHaveBeenCalledWith(
                offerId,
                updateData,
            );
        });

        it("should handle invalid offer ID", async () => {
            const invalidId = "invalid-id";
            const invalidIdError = new Error("Invalid offer ID");
            jest.spyOn(offersService, "updateOffer").mockRejectedValue(
                invalidIdError,
            );

            await expect(
                controller.updateOffer(invalidId, updateData),
            ).rejects.toThrow();
            expect(offersService.updateOffer).toHaveBeenCalledWith(
                invalidId,
                updateData,
            );
        });
    });

    describe("enableCloaking", () => {
        it("should call offersService.enableCloaking with correct parameters", async () => {
            const enableCloakDto = {
                offerId: 12345,
                enableCloaking: true,
            };

            const expectedResult = {
                success: true,
                message: "Cloaking enabled for offer 12345",
                data: { id: 12345, cloaking_enabled: true },
            };

            jest.spyOn(offersService, "enableCloaking").mockResolvedValue(
                expectedResult,
            );

            const result = await controller.enableCloaking(enableCloakDto);

            expect(offersService.enableCloaking).toHaveBeenCalledWith(
                enableCloakDto,
            );
            expect(result).toEqual(expectedResult);
        });

        it("should handle enableCloaking service errors", async () => {
            const enableCloakDto = {
                offerId: 12345,
                enableCloaking: true,
            };

            const error = new Error("Service error");
            jest.spyOn(offersService, "enableCloaking").mockRejectedValue(
                error,
            );

            await expect(
                controller.enableCloaking(enableCloakDto),
            ).rejects.toThrow("Service error");
        });
    });

    describe("enableGraySection", () => {
        it("should call offersService.enableGraySection with correct parameters", async () => {
            const enableGraySectionDto = {
                offerId: 12345,
                enableGraySection: true,
            };

            const expectedResult = {
                success: true,
                message: "Gray section enabled for offer 12345",
                data: { id: 12345, gray_section_enabled: true },
            };

            jest.spyOn(offersService, "enableGraySection").mockResolvedValue(
                expectedResult,
            );

            const result =
                await controller.enableGraySection(enableGraySectionDto);

            expect(offersService.enableGraySection).toHaveBeenCalledWith(
                enableGraySectionDto,
            );
            expect(result).toEqual(expectedResult);
        });

        it("should handle enableGraySection service errors", async () => {
            const enableGraySectionDto = {
                offerId: 12345,
                enableGraySection: true,
            };

            const error = new Error("Service error");
            jest.spyOn(offersService, "enableGraySection").mockRejectedValue(
                error,
            );

            await expect(
                controller.enableGraySection(enableGraySectionDto),
            ).rejects.toThrow("Service error");
        });
    });
});
