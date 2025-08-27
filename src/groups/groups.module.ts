import { Module } from "@nestjs/common";

import { GroupsController } from "./groups.controller";
import { GroupsService } from "./groups.service";
import { KeitaroService } from "../keitaro/keitaro.service";

@Module({
    controllers: [GroupsController],
    providers: [GroupsService, KeitaroService],
})
export class GroupsModule {}
