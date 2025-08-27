import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from "@nestjs/common";

import { DomainsService } from "./domains.service";
import { CreateDomainDto } from "./dto/create-domain.dto";
import { TokenGuard } from "../auth/token.guard";

@Controller("domains")
@UseGuards(TokenGuard)
export class DomainsController {
    constructor(private readonly domainsService: DomainsService) {}

    @Get("")
    async getDomains() {
        return this.domainsService.getDomains();
    }

    @Get("check/:domain")
    async checkDomainExists(@Param("domain") domain: string) {
        const exists = await this.domainsService.checkDomainExists(domain);
        return { exists, domain };
    }

    @Get(":id")
    async getDomainById(@Param("id") id: string) {
        const domainId = parseInt(id, 10);
        return this.domainsService.getDomainById(domainId);
    }

    @Post("create")
    async createDomain(@Body() body: CreateDomainDto) {
        return this.domainsService.createDomain(body);
    }

    @Delete(":id")
    async deleteDomain(@Param("id") id: string) {
        const domainId = parseInt(id, 10);
        return this.domainsService.deleteDomain(domainId);
    }
}
