import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { Logger } from "../utils/logger";
import { AppBannedDto, PreviewResponseDto } from "./dto/app-banned.dto";
import { FailoverService } from "./failover.service";

@Controller("failover")
export class FailoverController {
    constructor(private readonly failoverService: FailoverService) {}

    @Post("webhooks/app-banned/preview")
    @HttpCode(HttpStatus.OK)
    async previewAppBanned(
        @Body() dto: AppBannedDto,
    ): Promise<PreviewResponseDto> {
        Logger.info(
            `Received preview request for app: ${dto.platform}/${dto.app_id}`,
            undefined,
            "FailoverController",
        );

        return await this.failoverService.previewAppBan(
            dto.platform,
            dto.app_id,
        );
    }

    @Post("webhooks/app-banned")
    @HttpCode(HttpStatus.OK)
    async handleAppBanned(
        @Body() dto: AppBannedDto,
    ): Promise<PreviewResponseDto> {
        Logger.info(
            `Received app banned event: ${dto.platform}/${dto.app_id}`,
            undefined,
            "FailoverController",
        );

        return await this.failoverService.handleAppBan(
            dto.platform,
            dto.app_id,
        );
    }

    @Post("webhooks/health")
    @HttpCode(HttpStatus.OK)
    health() {
        return {
            status: "ok",
            timestamp: new Date().toISOString(),
        };
    }
}
