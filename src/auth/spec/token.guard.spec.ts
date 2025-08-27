import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenGuard } from "../token.guard";
import { ExecutionContext } from "@nestjs/common";

describe("TokenGuard", () => {
    let guard: TokenGuard;
    let configService: jest.Mocked<ConfigService>;

    beforeEach(async () => {
        const mockConfigService = {
            get: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TokenGuard,
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        guard = module.get<TokenGuard>(TokenGuard);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it("should be defined", () => {
        expect(guard).toBeDefined();
    });

    describe("canActivate", () => {
        it("should allow access with valid token", () => {
            const validToken = "valid-token";
            configService.get.mockReturnValue(validToken);

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: `Bearer ${validToken}`,
                        },
                    }),
                }),
            } as ExecutionContext;

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(configService.get).toHaveBeenCalledWith("auth.token");
        });

        it("should deny access without authorization header", () => {
            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {},
                    }),
                }),
            } as ExecutionContext;

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow(
                "Authorization header is required",
            );
        });

        it("should deny access with invalid token", () => {
            const validToken = "valid-token";
            const invalidToken = "invalid-token";
            configService.get.mockReturnValue(validToken);

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: `Bearer ${invalidToken}`,
                        },
                    }),
                }),
            } as ExecutionContext;

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should deny access with malformed authorization header", () => {
            const validToken = "valid-token";
            configService.get.mockReturnValue(validToken);

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: `Bearer ${validToken}extra`,
                        },
                    }),
                }),
            } as ExecutionContext;

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should deny access with empty token", () => {
            const validToken = "valid-token";
            configService.get.mockReturnValue(validToken);

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: "Bearer ",
                        },
                    }),
                }),
            } as ExecutionContext;

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should handle case when config service returns null", () => {
            configService.get.mockReturnValue(null);

            const context = {
                switchToHttp: () => ({
                    getRequest: () => ({
                        headers: {
                            authorization: "Bearer any-token",
                        },
                    }),
                }),
            } as ExecutionContext;

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });
    });
});
