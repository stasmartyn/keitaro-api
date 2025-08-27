import { Module } from "@nestjs/common";

import { AppsService } from "./v1/apps.service";
import { AppsController } from "./v1/apps.controller";
import { AppsV2Service } from "./v2/apps.service";
import { AppsV2Controller } from "./v2/apps.controller";
import { KeitaroService } from "../keitaro/keitaro.service";
import { DatabaseModule } from "../database/database.module";

@Module({
    imports: [DatabaseModule],
    providers: [AppsService, AppsV2Service, KeitaroService],
    controllers: [AppsController, AppsV2Controller],
})
export class AppsModule {}
