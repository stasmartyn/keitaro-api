import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class TokenGuard implements CanActivate {
    constructor(
        private configService: ConfigService,
        private reflector: Reflector,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;
        const validToken = this.configService.get<string>("auth.token");

        if (!authHeader) {
            throw new UnauthorizedException("Authorization header is required");
        }

        const token = authHeader.replace("Bearer ", "");

        if (token !== validToken) {
            throw new UnauthorizedException("Invalid token");
        }

        return true;
    }
}
