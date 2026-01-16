import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.providers";
import { Logger } from "../utils/logger";

@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

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

    async onModuleDestroy() {
        await this.redis.quit();
        Logger.info("Redis connection closed", undefined, "RedisService");
    }
}
