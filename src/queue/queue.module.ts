import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { queueProviders } from "./queue.providers";
import { QueueService } from "./queue.service";
import { RedisModule } from "../redis/redis.module";
import { NamingSharingDlqService } from "./services/naming-sharing-dlq.service";
import { QueueBoardController } from "./queue-board.controller";
import { NamingSharingWorker } from "./workers/naming-sharing.worker";
import { NamingSharingProgressGateway } from "./gateways/naming-sharing-progress.gateway";
import { KeitaroModule } from "../keitaro/keitaro.module";
import { QueueController } from "./queue.controller";

@Global()
@Module({
    imports: [RedisModule, ConfigModule, KeitaroModule],
    providers: [
        ...queueProviders,
        QueueService,
        NamingSharingDlqService,
        NamingSharingWorker,
        NamingSharingProgressGateway,
    ],
    controllers: [QueueBoardController, QueueController],
    exports: [
        QueueService,
        NamingSharingDlqService,
        NamingSharingProgressGateway,
    ],
})
export class QueueModule {}
