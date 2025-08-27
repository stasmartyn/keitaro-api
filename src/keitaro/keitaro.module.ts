import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { KeitaroService } from "./keitaro.service";
import { KeitaroProxyController } from "./keitaro-proxy.controller";
import { KeitaroProxyService } from "./keitaro-proxy.service";

@Module({
    imports: [ConfigModule],
    controllers: [KeitaroProxyController],
    providers: [KeitaroService, KeitaroProxyService],
    exports: [KeitaroService],
})
export class KeitaroModule {}
