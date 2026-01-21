import { Controller, Post, Body, UseGuards, Delete } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { TokenGuard } from "../auth/token.guard";
import { NamingSharingJobData } from "./queues/naming-sharing.types";
import { Logger } from "../utils/logger";

@Controller("queue/naming-sharing")
@UseGuards(TokenGuard)
export class QueueController {
    constructor(private readonly queueService: QueueService) {}

    @Delete("clear")
    async clearQueue() {
        await this.queueService.clearNamingSharingQueue();
        return {
            success: true,
            message: "Queue cleared successfully",
        };
    }

    @Post("add")
    async addJob(@Body() jobData: NamingSharingJobData) {
        const queue = this.queueService.getNamingSharingQueue();

        if (jobData.items.length > 10) {
            return {
                error: "Batch size exceeded",
                message: "Maximum 10 items per batch",
                received: jobData.items.length,
            };
        }

        if (jobData.items.length === 0) {
            return {
                error: "Empty items array",
                message: "At least 1 item is required",
            };
        }

        const job = await queue.add("process-naming-batch", jobData);

        Logger.info(
            `Job added to naming-sharing queue: ${job.id}`,
            undefined,
            "QueueController",
        );

        return {
            success: true,
            jobId: job.id,
            queue: "naming-sharing",
            itemsCount: jobData.items.length,
        };
    }
}
