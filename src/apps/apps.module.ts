import { Module } from "@nestjs/common";

import { AppsService } from "./v1/apps.service";
import { AppsController } from "./v1/apps.controller";
import { AppsV2Service } from "./v2/apps.service";
import { AppsV2Controller } from "./v2/apps.controller";
import { AppsLegacyController } from "./apps-legacy.controller";
import { CampaignDataService } from "./campaign-data.service";
import { KeitaroService } from "../keitaro/keitaro.service";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [
        AppsService,
        AppsV2Service,
        CampaignDataService,
        KeitaroService,
    ],
    controllers: [AppsController, AppsV2Controller, AppsLegacyController],
})
export class AppsModule {}
