import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.providers";
import { Logger } from "../utils/logger";

@Injectable()
export class RedisService implements OnModuleDestroy {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

    async ping(): Promise<{ connected: boolean; ping_ms?: number }> {
        try {
            const start = Date.now();
            const result = await this.redis.ping();
            const ping_ms = Date.now() - start;

            if (result === "PONG") {
                return { connected: true, ping_ms };
            }

            return { connected: false };
        } catch (error) {
            Logger.error(
                `Redis ping failed: ${error.message}`,
                error.stack,
                "RedisService",
            );
            return { connected: false };
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
