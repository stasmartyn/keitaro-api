import { Injectable } from "@nestjs/common";

import { KeitaroService } from "../keitaro/keitaro.service";
import { wrapWithErrorHandler } from "../utils/error-wrapper";
import { IGroup } from "./interfaces/group.interface";

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

    private async getGroupsInternal(type: string): Promise<IGroup[]> {
        return this.keitaroService.getGroups(type);
    }
}
