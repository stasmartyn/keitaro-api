import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TokenGuard } from "../token.guard";
import { ExecutionContext } from "@nestjs/common";
import { Logger } from "../../utils/logger";

jest.spyOn(Logger, "error").mockImplementation(() => {});

const makeContext = (authorization?: string): ExecutionContext => {
    const handler = jest.fn();
    class TestController {}

    return {
        getHandler: () => handler,
        getClass: () => TestController,
        switchToHttp: () => ({
            getRequest: () => ({
                headers: authorization ? { authorization } : {},
            }),
        }),
    } as unknown as ExecutionContext;
};

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

            const context = makeContext(`Bearer ${validToken}`);

            const result = guard.canActivate(context);

            expect(result).toBe(true);
            expect(configService.get).toHaveBeenCalledWith("auth.token");
        });

        it("should deny access without authorization header", () => {
            const context = makeContext();

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

            const context = makeContext(`Bearer ${invalidToken}`);

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should deny access with malformed authorization header", () => {
            const validToken = "valid-token";
            configService.get.mockReturnValue(validToken);

            const context = makeContext(`Bearer ${validToken}extra`);

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should deny access with empty token", () => {
            const validToken = "valid-token";
            configService.get.mockReturnValue(validToken);

            const context = makeContext("Bearer ");

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });

        it("should handle case when config service returns null", () => {
            configService.get.mockReturnValue(null);

            const context = makeContext("Bearer any-token");

            expect(() => guard.canActivate(context)).toThrow(
                UnauthorizedException,
            );
            expect(() => guard.canActivate(context)).toThrow("Invalid token");
        });
    });
});
