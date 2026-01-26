import { Controller, All, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { QueueService } from "./queue.service";
import { TokenGuard } from "../auth/token.guard";
import { Logger } from "../utils/logger";

@Controller("admin/queues")
@UseGuards(TokenGuard)
export class QueueBoardController {
    private serverAdapter: ExpressAdapter | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly queueService: QueueService,
    ) {
        this.initializeBullBoard();
    }

    private initializeBullBoard() {
        const isEnabled = this.configService.get<boolean>("bullBoard.enabled");

        if (!isEnabled) {
            Logger.info(
                "Bull Board is disabled (ENABLE_BULL_BOARD=false)",
                undefined,
                "QueueBoardController",
            );
            return;
        }

        try {
            this.serverAdapter = new ExpressAdapter();
            this.serverAdapter.setBasePath("/api/admin/queues");

            const queues = [
                this.queueService.getNamingSharingQueue(),
                this.queueService.getNamingSharingDlqQueue(),
            ];

            createBullBoard({
                queues: queues.map((queue) => new BullMQAdapter(queue)),
                serverAdapter: this.serverAdapter,
            });

            Logger.info(
                "Bull Board initialized for queues",
                undefined,
                "QueueBoardController",
            );
        } catch (error) {
            Logger.error(
                `Failed to initialize Bull Board: ${error instanceof Error ? error.message : "Unknown error"}`,
                error instanceof Error ? error.stack : undefined,
                "QueueBoardController",
            );
        }
    }

    @All("*")
    async handleRequest(@Req() req: Request, @Res() res: Response) {
        const isEnabled = this.configService.get<boolean>("bullBoard.enabled");

        if (!isEnabled) {
            return res.status(404).json({
                error: "Bull Board is not available",
                message: "Enable with ENABLE_BULL_BOARD=true",
            });
        }

        if (!this.serverAdapter) {
            return res.status(503).json({
                error: "Bull Board not initialized",
            });
        }

        this.serverAdapter.getRouter()(req, res);
    }
}
