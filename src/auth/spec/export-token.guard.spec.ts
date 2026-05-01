import {
    InternalServerErrorException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ExecutionContext } from "@nestjs/common";
import { ExportTokenGuard } from "../export-token.guard";

const makeGuard = (token: string | undefined) =>
    new ExportTokenGuard({
        get: jest.fn().mockReturnValue(token),
    } as unknown as ConfigService);

const makeContext = (authorization: string | undefined): ExecutionContext =>
    ({
        switchToHttp: () => ({
            getRequest: () => ({
                headers: authorization ? { authorization } : {},
            }),
        }),
    }) as ExecutionContext;

describe("ExportTokenGuard", () => {
    describe("constructor", () => {
        it("throws InternalServerErrorException when EXPORT_TOKEN is not configured", () => {
            expect(() => makeGuard(undefined)).toThrow(
                InternalServerErrorException,
            );
        });

        it("throws InternalServerErrorException when EXPORT_TOKEN is empty string", () => {
            expect(() => makeGuard("")).toThrow(InternalServerErrorException);
        });
    });

    describe("canActivate", () => {
        const SECRET = "super-secret-token";
        let guard: ExportTokenGuard;

        beforeEach(() => {
            guard = makeGuard(SECRET);
        });

        it("returns true for correct Bearer token", () => {
            expect(guard.canActivate(makeContext(`Bearer ${SECRET}`))).toBe(
                true,
            );
        });

        it("is case-insensitive for Bearer scheme", () => {
            expect(guard.canActivate(makeContext(`bearer ${SECRET}`))).toBe(
                true,
            );
        });

        it("throws 401 when Authorization header is absent", () => {
            expect(() => guard.canActivate(makeContext(undefined))).toThrow(
                new UnauthorizedException("Authorization header is required"),
            );
        });

        it("throws 401 for wrong token value", () => {
            expect(() =>
                guard.canActivate(makeContext("Bearer wrong-token")),
            ).toThrow(new UnauthorizedException("Invalid token"));
        });

        it("throws 401 for missing token after Bearer", () => {
            expect(() => guard.canActivate(makeContext("Bearer "))).toThrow(
                new UnauthorizedException("Invalid authorization format"),
            );
        });

        it("throws 401 for non-Bearer scheme", () => {
            expect(() =>
                guard.canActivate(makeContext(`Basic ${SECRET}`)),
            ).toThrow(
                new UnauthorizedException("Invalid authorization format"),
            );
        });

        it("throws 401 for header without scheme", () => {
            expect(() => guard.canActivate(makeContext(SECRET))).toThrow(
                new UnauthorizedException("Invalid authorization format"),
            );
        });
    });
});
