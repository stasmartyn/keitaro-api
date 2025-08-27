import { Body, Delete, Get, Param, Post } from "@nestjs/common";

import { AppsService } from "./apps.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { VersionController } from "../../utils/version.decorator";
import { CopyCampaignDto } from "../dto/copy-campaign.dto";
import { CreateNoOrgCampaignDto } from "../dto/create-no-org-campaign.dto";
import { CreateByOfferDto } from "../dto/create-by-offer.dto";
import { CreateOnelinkCampaignDto } from "../dto/create-onelink.campaign.dto";

@VersionController("v1", "apps")
export class AppsController {
    constructor(private readonly appsService: AppsService) {}

    @Get("all-campaigns")
    async getAllCampaigns() {
        return this.appsService.getAllCampaigns();
    }

    @Post("create-campaign")
    async createApp(@Body() body: CreateAppDto) {
        return this.appsService.createApp(body);
    }

    @Post("copy-campaign")
    async copyCampaign(@Body() body: CopyCampaignDto) {
        try {
            return this.appsService.copyCampaign(body);
        } catch (error) {
            console.log("error", error);
            throw error;
        }
    }

    @Post("create-no-org-campaign")
    async createNoOrgCampaign(@Body() body: CreateNoOrgCampaignDto) {
        return this.appsService.createNoOrgCampaign(body);
    }

    @Post("create-by-offer")
    async createByOffer(@Body() body: CreateByOfferDto) {
        return this.appsService.createByOffer(body);
    }

    @Post("create-onelink-campaign")
    async createOnelinkCampaign(@Body() body: CreateOnelinkCampaignDto) {
        return this.appsService.createOnelinkCampaign(body);
    }

    @Delete("campaign/:id")
    async deleteCampaign(@Param("id") id: string) {
        return this.appsService.deleteCampaign(id);
    }

    @Delete("traffic-source/:id")
    async deleteTrafficSource(@Param("id") id: string) {
        return this.appsService.deleteTrafficSource(id);
    }
}
