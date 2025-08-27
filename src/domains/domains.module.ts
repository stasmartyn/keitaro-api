import { Module } from "@nestjs/common";

import { DomainsController } from "./domains.controller";
import { DomainsService } from "./domains.service";
import { KeitaroService } from "../keitaro/keitaro.service";

@Module({
    controllers: [DomainsController],
    providers: [DomainsService, KeitaroService],
})
export class DomainsModule {}
