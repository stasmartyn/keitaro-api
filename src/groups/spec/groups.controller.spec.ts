import { ConfigService } from "@nestjs/config";

import { Test, TestingModule } from "@nestjs/testing";
import { TokenGuard } from "../../auth/token.guard";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { GroupsController } from "../groups.controller";
import { GroupsService } from "../groups.service";
import { IGroup } from "../interfaces/group.interface";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

describe("GroupsController", () => {
    let controller: GroupsController;
    let keitaroService: jest.Mocked<KeitaroService>;
    let tokenGuard: jest.Mocked<TokenGuard>;

    const mockGroups: IGroup[] = [
        {
            id: 1,
            name: "Test Group 1",
            type: "android",
            createdAt: new Date("2024-01-01"),
            updatedAt: new Date("2024-01-01"),
        },
        {
            id: 2,
            name: "Test Group 2",
            type: "ios",
            createdAt: new Date("2024-01-02"),
            updatedAt: new Date("2024-01-02"),
        },
    ];

    beforeEach(async () => {
        const mockKeitaroService = {
            getGroups: jest.fn(),
        };

        const mockTokenGuard = {
            canActivate: jest.fn(),
        };

        const mockConfigService = {
            get: jest.fn().mockReturnValue("valid-token"),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GroupsController],
            providers: [
                GroupsService,
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

        controller = module.get<GroupsController>(GroupsController);
        keitaroService = module.get(KeitaroService);
        tokenGuard = module.get(TokenGuard);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("GET /groups", () => {
        beforeEach(() => {
            tokenGuard.canActivate.mockReturnValue(true);
        });

        it("should return groups successfully", async () => {
            const type = "android";
            keitaroService.getGroups.mockResolvedValue(mockGroups);

            const result = await controller.getGroups(type);

            expect(result).toEqual(mockGroups);
            expect(keitaroService.getGroups).toHaveBeenCalledWith(type);
            expect(keitaroService.getGroups).toHaveBeenCalledTimes(1);
        });

        it("should return empty array when no groups found", async () => {
            const type = "nonexistent";
            keitaroService.getGroups.mockResolvedValue([]);

            const result = await controller.getGroups(type);

            expect(result).toEqual([]);
            expect(keitaroService.getGroups).toHaveBeenCalledWith(type);
        });

        it("should propagate keitaro service error", async () => {
            const type = "android";
            const errorMessage = "Keitaro API error";
            keitaroService.getGroups.mockRejectedValue(new Error(errorMessage));

            await expect(controller.getGroups(type)).rejects.toThrow(
                errorMessage,
            );
            expect(keitaroService.getGroups).toHaveBeenCalledWith(type);
        });

        it("should propagate network timeout error", async () => {
            const type = "android";
            const timeoutError = new Error("Request timeout");
            timeoutError.name = "TimeoutError";
            keitaroService.getGroups.mockRejectedValue(timeoutError);

            await expect(controller.getGroups(type)).rejects.toThrow(
                "Request timeout",
            );
        });

        it("should handle invalid type parameter", async () => {
            const type = "";
            keitaroService.getGroups.mockResolvedValue([]);

            const result = await controller.getGroups(type);

            expect(result).toEqual([]);
            expect(keitaroService.getGroups).toHaveBeenCalledWith(type);
        });

        it("should handle null type parameter", async () => {
            const type = null;
            keitaroService.getGroups.mockResolvedValue([]);

            const result = await controller.getGroups(type);

            expect(result).toEqual([]);
            expect(keitaroService.getGroups).toHaveBeenCalledWith(null);
        });
    });
});
