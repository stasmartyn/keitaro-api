import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";

import { GroupsService } from "./groups.service";
import { TokenGuard } from "../auth/token.guard";
import { CreateGroupDto } from "./dto/create-group.dto";

@Controller("groups")
@UseGuards(TokenGuard)
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @Get("")
    async getGroups(@Query("type") type: string) {
        return this.groupsService.getGroups(type);
    }

    @Post("")
    async createGroup(@Body() body: CreateGroupDto) {
        return this.groupsService.createGroup(body);
    }
}
