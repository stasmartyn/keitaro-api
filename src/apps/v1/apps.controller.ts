import { Body, Delete, Get, Param, Post, Put } from "@nestjs/common";

import { AppsService } from "./apps.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { VersionController } from "../../utils/version.decorator";
import { CopyCampaignDto } from "../dto/copy-campaign.dto";
import { CreateNoOrgCampaignDto } from "../dto/create-no-org-campaign.dto";
import { CreateByOfferDto } from "../dto/create-by-offer.dto";
import { CreateOnelinkCampaignDto } from "../dto/create-onelink.campaign.dto";
import { CreateRentCampaignDto } from "../dto/create-rent.campaign.dto";
import { UpdateCampaignDto } from "../dto/update-campaign.dto";
import { SyncAppDto } from "../dto/sync-app.dto";
import { CloseCloakDto } from "../dto/close-cloak.dto";
import { CloseGeoDto } from "../dto/close-geo.dto";
import { ShareNamingDto } from "../dto/share-naming.dto";
import { AllowTrafficDto } from "../dto/allow-traffic.dto";
import { ToggleTestFlowDto } from "../dto/toggle-test-flow.dto";

@VersionController("v1", "apps")
export class AppsController {
    constructor(private readonly appsService: AppsService) {}

    @Get("all-campaigns")
    async getAllCampaigns() {
        return this.appsService.getAllCampaigns();
    }

    @Get("full-campaign-info/:id")
    async getFullCampaignInfo(@Param("id") id: string) {
        return this.appsService.getFullCampaignInfo(id);
    }

    @Put("campaign/:id")
    async updateCampaign(
        @Param("id") id: string,
        @Body() body: UpdateCampaignDto,
    ) {
        return this.appsService.updateCampaign(id, body);
    }

    @Post("create-campaign")
    async createApp(@Body() body: CreateAppDto) {
        return this.appsService.createApp(body);
    }

    @Post("create-rent-campaign")
    async createRentCampaign(@Body() body: CreateRentCampaignDto) {
        return this.appsService.createRentCampaign(body);
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

    @Post("sync")
    async syncApp(@Body() body: SyncAppDto) {
        return this.appsService.syncApp(body);
    }

    @Post("close-cloak")
    async closeCloak(@Body() body: CloseCloakDto) {
        return this.appsService.closeCloak(body);
    }

    @Post("allow-all-traffic")
    async allowAllTraffic(@Body() body: AllowTrafficDto) {
        return this.appsService.allowAllTraffic(body);
    }

    @Post("close-geo")
    async closeGeo(@Body() body: CloseGeoDto) {
        return this.appsService.closeGeo(body);
    }

    @Post("share-naming")
    async shareNaming(@Body() body: ShareNamingDto) {
        return this.appsService.shareNaming(body);
    }

    @Post("toggle-test-flow")
    async toggleTestFlow(@Body() body: ToggleTestFlowDto) {
        return this.appsService.toggleTestFlow(body);
    }
}
