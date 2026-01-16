import { Controller, Get, Inject } from "@nestjs/common";
import { AppService } from "./app.service";
import { RedisService } from "../redis/redis.service";
import { ConnectionDB } from "../common/enums/db-enums";
import * as mongoose from "mongoose";

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
            },
            mongodb: {
                connected: mongoStatus.connected,
                ping_ms: mongoStatus.ping_ms,
            },
        };
    }

    private async checkMongoConnection(): Promise<{
        connected: boolean;
        ping_ms?: number;
    }> {
        try {
            const start = Date.now();
            const result = await this.mongooseConnection.connection.db
                .admin()
                .ping();
            const ping_ms = Date.now() - start;

            if (result && this.mongooseConnection.connection.readyState === 1) {
                return { connected: true, ping_ms };
            }

            return { connected: false };
        } catch {
            return { connected: false };
        }
    }
}
