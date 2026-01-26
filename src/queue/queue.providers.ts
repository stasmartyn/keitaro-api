import { Provider } from "@nestjs/common";
import { RedisService } from "../redis/redis.service";
import { Queue, QueueOptions } from "bullmq";
import { Logger } from "../utils/logger";

export const QUEUE_FACTORY = "QUEUE_FACTORY";

export interface QueueFactory {
    createQueue(name: string, options?: Partial<QueueOptions>): Queue;
}

export const queueProviders: Provider[] = [
    {
        provide: QUEUE_FACTORY,
        inject: [RedisService],
        useFactory: (redisService: RedisService): QueueFactory => {
            const redisClient = redisService.getClient();

            return {
                createQueue: (
                    name: string,
                    options?: Partial<QueueOptions>,
                ) => {
                    const queue = new Queue(name, {
                        connection: redisClient,
                        ...options,
                    });

                    queue.on("error", (error) => {
                        Logger.error(
                            `Queue ${name} error: ${error.message}`,
                            error.stack,
                            "QueueFactory",
                        );
                    });

                    Logger.info(
                        `Queue ${name} created`,
                        undefined,
                        "QueueFactory",
                    );

                    return queue;
                },
            };
        },
    },
];
