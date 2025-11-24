import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FailoverController } from "./failover.controller";
import { FailoverService } from "./failover.service";
import { KeitaroModule } from "../keitaro/keitaro.module";

@Module({
    imports: [ConfigModule, KeitaroModule],
    controllers: [FailoverController],
    providers: [FailoverService],
    exports: [FailoverService],
})
export class FailoverModule {}
