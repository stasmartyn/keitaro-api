import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
import { REDIS_CLIENT } from "./redis.providers";
import { Logger } from "../utils/logger";

@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(
        @Inject(REDIS_CLIENT) private readonly redis: Redis,
        private readonly configService: ConfigService,
    ) {}

    async ping(): Promise<{
        connected: boolean;
        ping_ms?: number;
        error?: string;
    }> {
        try {
            const start = Date.now();
            const result = await this.redis.ping();
            const ping_ms = Date.now() - start;

            if (result === "PONG") {
                return { connected: true, ping_ms };
            }

            return { connected: false };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            Logger.error(
                `Redis ping failed: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
                "RedisService",
            );
            return { connected: false, error: errorMessage };
        }
    }

    getClient(): Redis {
        return this.redis;
    }

    /**
     * Створює окремий Redis client для BullMQ Worker
     * Worker вимагає maxRetriesPerRequest: null для blocking операцій
     */
    getWorkerClient(): Redis {
        const redisConfig = this.configService.get("redis");

        if (redisConfig.url) {
            return new Redis(redisConfig.url, {
                maxRetriesPerRequest: null,
            });
        }

        const options: any = {
            host: redisConfig.host,
            port: redisConfig.port,
            db: redisConfig.db,
            maxRetriesPerRequest: null,
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

        return new Redis(options);
    }

    async onModuleDestroy() {
        await this.redis.quit();
        Logger.info("Redis connection closed", undefined, "RedisService");
    }
}
