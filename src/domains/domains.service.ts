import { Injectable } from "@nestjs/common";

import { KeitaroService } from "../keitaro/keitaro.service";
import { wrapWithErrorHandler } from "../utils/error-wrapper";
import { CreateDomainDto } from "./dto/create-domain.dto";
import { IDomain } from "./interfaces/domain.interface";

@Injectable()
export class DomainsService {
    constructor(private readonly keitaroService: KeitaroService) {}

    async getDomains() {
        const getDomainsWithErrorHandler = wrapWithErrorHandler(
            this.getDomainsInternal.bind(this),
            {
                functionName: "DomainsService.getDomains",
                additionalData: { endpoint: "GET /domains" },
            },
        );

        return getDomainsWithErrorHandler();
    }

    async checkDomainExists(domainName: string): Promise<boolean> {
        const checkDomainExistsWithErrorHandler = wrapWithErrorHandler(
            this.checkDomainExistsInternal.bind(this),
            {
                functionName: "DomainsService.checkDomainExists",
                additionalData: { endpoint: "GET /domains (check existence)" },
            },
        );

        return checkDomainExistsWithErrorHandler(
            domainName,
        ) as Promise<boolean>;
    }

    async getDomainById(domainId: number) {
        const getDomainByIdWithErrorHandler = wrapWithErrorHandler(
            this.getDomainByIdInternal.bind(this),
            {
                functionName: "DomainsService.getDomainById",
                additionalData: { endpoint: `GET /domains/${domainId}` },
            },
        );

        return getDomainByIdWithErrorHandler(domainId);
    }

    async createDomain(body: CreateDomainDto) {
        const createDomainWithErrorHandler = wrapWithErrorHandler(
            this.createDomainInternal.bind(this),
            {
                functionName: "DomainsService.createDomain",
                additionalData: { endpoint: "POST /domains/create" },
            },
        );

        return createDomainWithErrorHandler(body);
    }

    async deleteDomain(domainId: number) {
        const deleteDomainWithErrorHandler = wrapWithErrorHandler(
            this.deleteDomainInternal.bind(this),
            {
                functionName: "DomainsService.deleteDomain",
                additionalData: { endpoint: `DELETE /domains/${domainId}` },
            },
        );

        return deleteDomainWithErrorHandler(domainId);
    }

    private async getDomainsInternal(): Promise<IDomain[]> {
        return this.keitaroService.getDomains();
    }

    private async checkDomainExistsInternal(
        domainName: string,
    ): Promise<boolean> {
        return this.keitaroService.checkDomainExists(domainName);
    }

    private async getDomainByIdInternal(domainId: number): Promise<IDomain> {
        return this.keitaroService.getDomainById(domainId);
    }

    private async createDomainInternal(
        body: CreateDomainDto,
    ): Promise<IDomain> {
        const { domain, groupId, oneLinkSettings } = body;

        const domainExists =
            await this.keitaroService.checkDomainExists(domain);
        if (domainExists) {
            throw new Error(`Domain ${domain} already exists`);
        }

        const createdDomain = await this.keitaroService.createDomain(
            domain,
            groupId,
            oneLinkSettings,
        );
        return createdDomain;
    }

    private async deleteDomainInternal(domainId: number): Promise<any> {
        return this.keitaroService.deleteDomain(domainId);
    }
}
