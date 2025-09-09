import { BadRequestException, Injectable } from "@nestjs/common";

import { KeitaroService } from "../keitaro/keitaro.service";
import { wrapWithErrorHandler } from "../utils/error-wrapper";
import { IGroup } from "./interfaces/group.interface";
import { CreateGroupDto } from "./dto/create-group.dto";

@Injectable()
export class GroupsService {
    constructor(private readonly keitaroService: KeitaroService) {}

    async getGroups(type: string) {
        const getGroupsWithErrorHandler = wrapWithErrorHandler(
            this.getGroupsInternal.bind(this),
            {
                functionName: "GroupsService.getGroups",
                additionalData: { endpoint: "GET /groups" },
            },
        );

        return getGroupsWithErrorHandler(type);
    }

    async createGroup(body: CreateGroupDto) {
        const createGroupWithErrorHandler = wrapWithErrorHandler(
            this.createGroupInternal.bind(this),
            {
                functionName: "GroupsService.createGroup",
                additionalData: { endpoint: "POST /groups" },
            },
        );
        return createGroupWithErrorHandler(body);
    }

    private async createGroupInternal(body: CreateGroupDto) {
        const { name, type } = body;

        if (!name || !type) {
            throw new BadRequestException("Missing required fields.");
        }

        return this.keitaroService.createGroup(name, type);
    }

    private async getGroupsInternal(type: string): Promise<IGroup[]> {
        return this.keitaroService.getGroups(type);
    }
}
