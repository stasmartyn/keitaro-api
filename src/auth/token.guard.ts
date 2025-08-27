import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request } from "express";

@Injectable()
export class TokenGuard implements CanActivate {
    constructor(private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
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
