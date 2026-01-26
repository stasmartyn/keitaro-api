import { Controller, UseGuards, Delete } from "@nestjs/common";
import { QueueService } from "./queue.service";
import { TokenGuard } from "../auth/token.guard";

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
}
