import {
    Body,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
} from "@nestjs/common";

import { VersionController } from "../utils/version.decorator";
import { BanAppDto } from "./dto/ban-app.dto";
import { CreateNamingCampaignDto } from "./dto/create-naming-campaign.dto";
import { CreateSplitCampaignDto } from "./dto/create-split-campaign.dto";
import { UpdateNamingCampaignDto } from "./dto/update-naming-campaign.dto";
import { UpdateSplitCampaignDto } from "./dto/update-split-campaign.dto";
import { W2appService } from "./w2app.service";

@VersionController("v1", "w2app")
export class W2appController {
    constructor(private readonly w2appService: W2appService) {}

    @Post("split-campaign")
    async createSplitCampaign(@Body() body: CreateSplitCampaignDto) {
        return this.w2appService.createSplitCampaign(body);
    }

    @Put("split-campaign/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateSplitCampaign(
        @Param("id", ParseIntPipe) campaignId: number,
        @Body() body: UpdateSplitCampaignDto,
    ): Promise<void> {
        await this.w2appService.updateSplitCampaign(campaignId, body);
    }

    @Get("split-campaign/:id")
    async getSplitCampaignState(@Param("id", ParseIntPipe) campaignId: number) {
        return this.w2appService.getSplitCampaignState(campaignId);
    }

    @Put("split-campaign/:id/disable")
    @HttpCode(HttpStatus.NO_CONTENT)
    async disableSplitCampaign(
        @Param("id", ParseIntPipe) campaignId: number,
    ): Promise<void> {
        await this.w2appService.disableSplitCampaign(campaignId);
    }

    @Post("split-campaign/:id/ban-app")
    @HttpCode(HttpStatus.NO_CONTENT)
    async banAppInSplit(
        @Param("id", ParseIntPipe) campaignId: number,
        @Body() body: BanAppDto,
    ): Promise<void> {
        await this.w2appService.banAppInSplit(campaignId, body);
    }

    @Post("split-campaign/:id/unban-app")
    @HttpCode(HttpStatus.NO_CONTENT)
    async unbanAppInSplit(
        @Param("id", ParseIntPipe) campaignId: number,
        @Body() body: BanAppDto,
    ): Promise<void> {
        await this.w2appService.unbanAppInSplit(campaignId, body);
    }

    @Post("naming-campaign")
    async createNamingCampaign(@Body() body: CreateNamingCampaignDto) {
        return this.w2appService.createNamingCampaign(body);
    }

    @Put("naming-campaign/:id")
    @HttpCode(HttpStatus.NO_CONTENT)
    async updateNamingCampaign(
        @Param("id", ParseIntPipe) campaignId: number,
        @Body() body: UpdateNamingCampaignDto,
    ): Promise<void> {
        await this.w2appService.updateNamingCampaign(campaignId, body);
    }

    @Put("naming-campaign/:id/disable")
    @HttpCode(HttpStatus.NO_CONTENT)
    async disableNamingCampaign(
        @Param("id", ParseIntPipe) campaignId: number,
    ): Promise<void> {
        await this.w2appService.disableNamingCampaign(campaignId);
    }
}
