import { Body, Controller, Post } from "@nestjs/common";
import { AppsService } from "./v1/apps.service";
import { CreateAppDto } from "./dto/create-app.dto";

@Controller("apps")
export class AppsLegacyController {
    constructor(private readonly appsService: AppsService) {}

    @Post("create-campaign")
    async createApp(@Body() body: CreateAppDto) {
        return this.appsService.createApp(body);
    }
}
