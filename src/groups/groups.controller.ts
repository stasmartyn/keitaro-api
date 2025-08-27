import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { GroupsService } from "./groups.service";
import { TokenGuard } from "../auth/token.guard";

@Controller("groups")
@UseGuards(TokenGuard)
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @Get("")
    async getGroups(@Query("type") type: string) {
        return this.groupsService.getGroups(type);
    }
}
