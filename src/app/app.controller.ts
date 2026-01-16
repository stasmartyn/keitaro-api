import { Controller, Get, Inject } from "@nestjs/common";
import { AppService } from "./app.service";
import { RedisService } from "../redis/redis.service";
import { ConnectionDB } from "../common/enums/db-enums";
import * as mongoose from "mongoose";
import { Logger } from "../utils/logger";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly redisService: RedisService,
        @Inject(ConnectionDB.DATABASE_CONNECTION)
        private readonly mongooseConnection: typeof mongoose,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("health")
    async getHealth() {
        const [redisStatus, mongoStatus] = await Promise.all([
            this.redisService.ping(),
            this.checkMongoConnection(),
        ]);

        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            redis: {
                connected: redisStatus.connected,
                ping_ms: redisStatus.ping_ms,
                error: redisStatus.error,
            },
            mongodb: {
                connected: mongoStatus.connected,
                ping_ms: mongoStatus.ping_ms,
                error: mongoStatus.error,
            },
        };
    }

    private async checkMongoConnection(): Promise<{
        connected: boolean;
        ping_ms?: number;
        error?: string;
    }> {
        try {
            const start = Date.now();
            const isConnected =
                this.mongooseConnection.connection.readyState === 1;

            if (isConnected) {
                await this.mongooseConnection.connection.db.admin().ping();
            }

            return {
                connected: isConnected,
                ping_ms: isConnected ? Date.now() - start : undefined,
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : "Unknown error";
            Logger.error(
                `MongoDB ping failed: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined,
                "AppController",
            );
            return { connected: false, error: errorMessage };
        }
    }
}
