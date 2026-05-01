import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { Request } from "express";

@Injectable()
export class ExportTokenGuard implements CanActivate {
    private readonly expectedToken: string;

    constructor(private readonly configService: ConfigService) {
        const exportToken = this.configService.get<string>("export.token");
        if (!exportToken) {
            throw new InternalServerErrorException(
                "EXPORT_TOKEN is not configured",
            );
        }
        this.expectedToken = exportToken;
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException("Authorization header is required");
        }

        const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
        if (!match) {
            throw new UnauthorizedException("Invalid authorization format");
        }
        const token = match[1];

        const tokenBuf = Buffer.from(token);
        const expectedBuf = Buffer.from(this.expectedToken);

        if (
            tokenBuf.length !== expectedBuf.length ||
            !timingSafeEqual(tokenBuf, expectedBuf)
        ) {
            throw new UnauthorizedException("Invalid token");
        }

        return true;
    }
}
