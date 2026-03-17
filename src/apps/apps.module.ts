import { Module } from "@nestjs/common";

import { AppsService } from "./v1/apps.service";
import { AppsController } from "./v1/apps.controller";
import { CampaignDataService } from "./campaign-data.service";
import { KeitaroService } from "../keitaro/keitaro.service";

@Module({
    providers: [AppsService, CampaignDataService, KeitaroService],
    controllers: [AppsController],
})
export class AppsModule {}
