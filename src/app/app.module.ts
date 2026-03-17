import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { APP_GUARD } from "@nestjs/core";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TokenGuard } from "../auth/token.guard";
import { AppsModule } from "../apps/apps.module";
import configuration from "../config/configuration";
import { GroupsModule } from "../groups/groups.module";
import { DomainsModule } from "../domains/domains.module";
import { KeitaroModule } from "../keitaro/keitaro.module";
import { OffersModule } from "../offers/offers.module";
import { ReportModule } from "../report/report.module";
import { FailoverModule } from "../failover/failover.module";
import { RedisModule } from "../redis/redis.module";
import { QueueModule } from "../queue/queue.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [configuration],
        }),
        RedisModule,
        QueueModule,
        AppsModule,
        GroupsModule,
        DomainsModule,
        OffersModule,
        KeitaroModule,
        ReportModule,
        FailoverModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_GUARD,
            useClass: TokenGuard,
        },
    ],
})
export class AppModule {}
