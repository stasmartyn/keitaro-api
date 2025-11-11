import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { TokenGuard } from "../../auth/token.guard";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { DomainsController } from "../domains.controller";
import { DomainsService } from "../domains.service";
import { CreateDomainDto } from "../dto/create-domain.dto";
import { IDomain } from "../interfaces/domain.interface";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

describe("DomainsController", () => {
    let controller: DomainsController;
    let keitaroService: jest.Mocked<KeitaroService>;
    let tokenGuard: jest.Mocked<TokenGuard>;

    const mockDomains: IDomain[] = [
        {
            id: 1,
            name: "test1.com",
            group_id: 1,
            ssl_redirect: true,
            allow_indexing: false,
            admin_dashboard: true,
            catch_not_found: false,
            default_campaign_id: 123,
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        },
        {
            id: 2,
            name: "test2.com",
            group_id: 2,
            ssl_redirect: false,
            allow_indexing: true,
            admin_dashboard: false,
            catch_not_found: true,
            default_campaign_id: 456,
            createdAt: new Date("2024-01-02"),
            updatedAt: new Date("2024-01-02"),
        },
    ];

    const mockCreatedDomain: IDomain = {
        id: 3,
        name: "newdomain.com",
        group_id: 1,
        ssl_redirect: true,
        allow_indexing: false,
        admin_dashboard: true,
        catch_not_found: false,
        default_campaign_id: 789,
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-03"),
    };

    const mockCreateDomainDto: CreateDomainDto = {
        domain: "newdomain.com",
        groupId: 1,
        oneLinkSettings:
            '{"catch_not_found": false, "default_campaign_id": 789}',
    };

    beforeEach(async () => {
        const mockKeitaroService = {
            getDomains: jest.fn(),
            createDomain: jest.fn(),
            deleteDomain: jest.fn(),
            getDomainById: jest.fn(),
            checkDomainExists: jest.fn(),
        };

        const mockTokenGuard = {
            canActivate: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue("valid-token"),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DomainsController],
            providers: [
                DomainsService,
                {
                    provide: KeitaroService,
                    useValue: mockKeitaroService,
                },
                {
                    provide: TokenGuard,
                    useValue: mockTokenGuard,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        })
            .overrideGuard(TokenGuard)
            .useValue(mockTokenGuard)
            .compile();

        controller = module.get<DomainsController>(DomainsController);
        keitaroService = module.get(KeitaroService);
        tokenGuard = module.get(TokenGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("GET /domains", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should return domains successfully", async () => {
            keitaroService.getDomains.mockResolvedValue(mockDomains);

            const result = await controller.getDomains();

            expect(result).toEqual(mockDomains);
            expect(keitaroService.getDomains).toHaveBeenCalledTimes(1);
        });

        it("should return empty array when no domains found", async () => {
            keitaroService.getDomains.mockResolvedValue([]);

            const result = await controller.getDomains();

            expect(result).toEqual([]);
            expect(keitaroService.getDomains).toHaveBeenCalledTimes(1);
        });

        it("should propagate keitaro service error", async () => {
            const errorMessage = "Keitaro API error";
            keitaroService.getDomains.mockRejectedValue(
                new Error(errorMessage),
            );

            await expect(controller.getDomains()).rejects.toThrow(errorMessage);
            expect(keitaroService.getDomains).toHaveBeenCalledTimes(1);
        });

        it("should propagate network timeout error", async () => {
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            keitaroService.getDomains.mockRejectedValue(timeoutError);

            await expect(controller.getDomains()).rejects.toThrow(
                "Request timeout",
            );
        });
    });

    describe("POST /domains/create", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should create domain successfully", async () => {
            keitaroService.createDomain.mockResolvedValue(mockCreatedDomain);

            const result = await controller.createDomain(mockCreateDomainDto);

            expect(result).toEqual(mockCreatedDomain);
            expect(keitaroService.createDomain).toHaveBeenCalledWith(
                mockCreateDomainDto.domain,
                mockCreateDomainDto.groupId,
                mockCreateDomainDto.oneLinkSettings,
            );
            expect(keitaroService.createDomain).toHaveBeenCalledTimes(1);
        });

        it("should propagate keitaro service error", async () => {
            const errorMessage = "Keitaro API error";
            keitaroService.createDomain.mockRejectedValue(
                new Error(errorMessage),
            );

            await expect(
                controller.createDomain(mockCreateDomainDto),
            ).rejects.toThrow(errorMessage);
        });

        it("should propagate network timeout error", async () => {
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            keitaroService.createDomain.mockRejectedValue(timeoutError);

            await expect(
                controller.createDomain(mockCreateDomainDto),
            ).rejects.toThrow("Request timeout");
        });

        it("should throw error when domain already exists", async () => {
            keitaroService.checkDomainExists.mockResolvedValue(true);

            await expect(
                controller.createDomain(mockCreateDomainDto),
            ).rejects.toThrow(
                `Domain ${mockCreateDomainDto.domain} already exists`,
            );
            expect(keitaroService.checkDomainExists).toHaveBeenCalledWith(
                mockCreateDomainDto.domain,
            );
        });
    });

    describe("GET /domains/check/:domain", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should return true when domain exists", async () => {
            const domainName = "test-domain.com";
            keitaroService.checkDomainExists.mockResolvedValue(true);

            const result = await controller.checkDomainExists(domainName);

            expect(result).toEqual({ exists: true, domain: domainName });
            expect(keitaroService.checkDomainExists).toHaveBeenCalledWith(
                domainName,
            );
            expect(keitaroService.checkDomainExists).toHaveBeenCalledTimes(1);
        });

        it("should return false when domain does not exist", async () => {
            const domainName = "non-existent-domain.com";
            keitaroService.checkDomainExists.mockResolvedValue(false);

            const result = await controller.checkDomainExists(domainName);

            expect(result).toEqual({ exists: false, domain: domainName });
            expect(keitaroService.checkDomainExists).toHaveBeenCalledWith(
                domainName,
            );
        });

        it("should propagate keitaro service error", async () => {
            const domainName = "test-domain.com";
            const errorMessage = "Keitaro API error";
            keitaroService.checkDomainExists.mockRejectedValue(
                new Error(errorMessage),
            );

            await expect(
                controller.checkDomainExists(domainName),
            ).rejects.toThrow(errorMessage);
            expect(keitaroService.checkDomainExists).toHaveBeenCalledWith(
                domainName,
            );
        });
    });

    describe("GET /domains/:id", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should return domain by ID successfully", async () => {
            const domainId = 123;
            const mockDomain = mockDomains[0];
            keitaroService.getDomainById.mockResolvedValue(mockDomain);

            const result = await controller.getDomainById(domainId.toString());

            expect(result).toEqual(mockDomain);
            expect(keitaroService.getDomainById).toHaveBeenCalledWith(domainId);
            expect(keitaroService.getDomainById).toHaveBeenCalledTimes(1);
        });

        it("should propagate keitaro service error", async () => {
            const domainId = 123;
            const errorMessage = "Keitaro API error";
            keitaroService.getDomainById.mockRejectedValue(
                new Error(errorMessage),
            );

            await expect(
                controller.getDomainById(domainId.toString()),
            ).rejects.toThrow(errorMessage);
            expect(keitaroService.getDomainById).toHaveBeenCalledWith(domainId);
        });

        it("should propagate network timeout error", async () => {
            const domainId = 123;
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            keitaroService.getDomainById.mockRejectedValue(timeoutError);

            await expect(
                controller.getDomainById(domainId.toString()),
            ).rejects.toThrow("Request timeout");
        });

        it("should handle invalid domain ID", async () => {
            const invalidId = "invalid-id";
            keitaroService.getDomainById.mockResolvedValue(mockDomains[0]);

            const result = await controller.getDomainById(invalidId);

            expect(result).toBeDefined();
            expect(keitaroService.getDomainById).toHaveBeenCalledWith(NaN);
        });
    });

    describe("DELETE /domains/:id", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should delete domain successfully", async () => {
            const domainId = 123;
            const deleteResult = { success: true, message: "Domain deleted" };
            keitaroService.deleteDomain.mockResolvedValue(deleteResult);

            const result = await controller.deleteDomain(domainId.toString());

            expect(result).toEqual(deleteResult);
            expect(keitaroService.deleteDomain).toHaveBeenCalledWith(domainId);
            expect(keitaroService.deleteDomain).toHaveBeenCalledTimes(1);
        });

        it("should propagate keitaro service error", async () => {
            const domainId = 123;
            const errorMessage = "Keitaro API error";
            keitaroService.deleteDomain.mockRejectedValue(
                new Error(errorMessage),
            );

            await expect(
                controller.deleteDomain(domainId.toString()),
            ).rejects.toThrow(errorMessage);
            expect(keitaroService.deleteDomain).toHaveBeenCalledWith(domainId);
        });

        it("should propagate network timeout error", async () => {
            const domainId = 123;
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            keitaroService.deleteDomain.mockRejectedValue(timeoutError);

            await expect(
                controller.deleteDomain(domainId.toString()),
            ).rejects.toThrow("Request timeout");
        });

        it("should handle invalid domain ID", async () => {
            const invalidId = "invalid-id";
            keitaroService.deleteDomain.mockResolvedValue({ success: true });

            const result = await controller.deleteDomain(invalidId);

            expect(result).toBeDefined();
            expect(keitaroService.deleteDomain).toHaveBeenCalledWith(NaN);
        });
    });
});
