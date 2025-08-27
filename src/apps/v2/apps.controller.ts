import { Body, Post } from "@nestjs/common";
import { AppsV2Service } from "./apps.service";
import { CreateAppDto } from "../dto/create-app.dto";
import { VersionController } from "../../utils/version.decorator";

@VersionController("v2", "apps")
export class AppsV2Controller {
    constructor(private readonly appsService: AppsV2Service) {}

    @Post("create-campaign")
    createApp(@Body() body: CreateAppDto) {
        return this.appsService.createApp(body);
    }
}
