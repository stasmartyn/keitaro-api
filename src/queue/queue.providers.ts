import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Queue, QueueOptions } from "bullmq";
import { Logger } from "../utils/logger";

export const QUEUE_FACTORY = "QUEUE_FACTORY";

export interface QueueFactory {
    createQueue(name: string, options?: Partial<QueueOptions>): Queue;
}

export const queueProviders: Provider[] = [
    {
        provide: QUEUE_FACTORY,
        inject: [ConfigService],
        useFactory: (configService: ConfigService): QueueFactory => {
            const redisConfig = configService.get("redis");

            // BullMQ вимагає connection options, не Redis клієнт
            const connectionOptions = redisConfig.url
                ? { url: redisConfig.url }
                : {
                      host: redisConfig.host,
                      port: redisConfig.port,
                      db: redisConfig.db,
                      ...(redisConfig.password && {
                          password: redisConfig.password,
                      }),
                      ...(redisConfig.username && {
                          username: redisConfig.username,
                      }),
                      ...(redisConfig.tls && { tls: {} }),
                  };

            return {
                createQueue: (
                    name: string,
                    options?: Partial<QueueOptions>,
                ) => {
                    const queue = new Queue(name, {
                        connection: connectionOptions as any,
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
