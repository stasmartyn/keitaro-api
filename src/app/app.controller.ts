import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service";
import { RedisService } from "../redis/redis.service";

@Controller()
export class AppController {
    constructor(
        private readonly appService: AppService,
        private readonly redisService: RedisService,
    ) {}

    @Get()
    getHello(): string {
        return this.appService.getHello();
    }

    @Get("health")
    async getHealth() {
        const redisStatus = await this.redisService.ping();

        return {
            status: "ok",
            timestamp: new Date().toISOString(),
            redis: {
                connected: redisStatus.connected,
                ping_ms: redisStatus.ping_ms,
                error: redisStatus.error,
            },
        };
    }
}
