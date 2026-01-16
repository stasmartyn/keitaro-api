import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis, { RedisOptions } from "ioredis";
import { Logger } from "../utils/logger";

export const REDIS_CLIENT = "REDIS_CLIENT";

const retryStrategy = (times: number) => Math.min(times * 50, 2000);

export const redisProviders: Provider[] = [
    {
        provide: REDIS_CLIENT,
        inject: [ConfigService],
        useFactory: async (configService: ConfigService): Promise<Redis> => {
            const redisConfig = configService.get("redis");

            let redis: Redis;

            if (redisConfig.url) {
                redis = new Redis(redisConfig.url, {
                    retryStrategy,
                    maxRetriesPerRequest: 3,
                });
            } else {
                const options: RedisOptions = {
                    host: redisConfig.host,
                    port: redisConfig.port,
                    db: redisConfig.db,
                    retryStrategy,
                    maxRetriesPerRequest: 3,
                };

                if (redisConfig.password) {
                    options.password = redisConfig.password;
                }

                if (redisConfig.username) {
                    options.username = redisConfig.username;
                }

                if (redisConfig.tls) {
                    options.tls = {};
                }

                redis = new Redis(options);
            }

            redis.on("connect", () => {
                Logger.info(
                    `Redis connected to ${redisConfig.host}:${redisConfig.port}`,
                    undefined,
                    "RedisProvider",
                );
            });

            redis.on("error", (error) => {
                Logger.error(
                    `Redis connection error: ${error.message}`,
                    error.stack,
                    "RedisProvider",
                );
            });

            redis.on("close", () => {
                Logger.warn(
                    "Redis connection closed",
                    undefined,
                    "RedisProvider",
                );
            });

            redis.on("reconnecting", () => {
                Logger.info(
                    "Redis reconnecting...",
                    undefined,
                    "RedisProvider",
                );
            });

            return redis;
        },
    },
];
