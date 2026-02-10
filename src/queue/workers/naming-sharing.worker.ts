import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { QueueService } from "../queue.service";
import { RedisService } from "../../redis/redis.service";
import { KeitaroService } from "../../keitaro/keitaro.service";
import { Logger } from "../../utils/logger";
import {
    NAMING_SHARING_QUEUE_NAME,
    namingSharingBackoff,
} from "../queues/naming-sharing.queue";
import {
    NamingSharingJobData,
    NamingItem,
    BATCH_SIZE,
    BatchResult,
} from "../queues/naming-sharing.types";
import { NamingSharingProgressGateway } from "../gateways/naming-sharing-progress.gateway";

@Injectable()
export class NamingSharingWorker implements OnModuleInit, OnModuleDestroy {
    private worker: Worker | null = null;

    private workerRedisClient: Redis | null = null;

    constructor(
        private readonly queueService: QueueService,
        private readonly redisService: RedisService,
        private readonly keitaroService: KeitaroService,
        private readonly progressGateway: NamingSharingProgressGateway,
    ) {}

    async onModuleInit() {
        // Використовуємо RedisService для створення Worker client
        // Worker вимагає maxRetriesPerRequest: null для blocking операцій
        this.workerRedisClient = this.redisService.getWorkerClient();

        this.worker = new Worker(
            NAMING_SHARING_QUEUE_NAME,
            async (job: Job<NamingSharingJobData>) => {
                try {
                    return await this.processJob(job);
                } catch (error) {
                    // Обробка помилок на рівні Worker, щоб він не падав
                    try {
                        Logger.error(
                            `Failed to process job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
                            error instanceof Error ? error.stack : undefined,
                            "NamingSharingWorker",
                        );
                    } catch {
                        // Якщо Logger не може записати, спробуємо ще раз через Logger
                        try {
                            Logger.error(
                                `[NamingSharingWorker] Failed to process job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
                                error instanceof Error
                                    ? error.stack
                                    : undefined,
                                "NamingSharingWorker",
                            );
                        } catch {
                            // Якщо і це не спрацювало, використовуємо console.error як останній fallback
                            console.error(
                                `[NamingSharingWorker] Failed to process job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
                            );
                        }
                    }
                    throw error; // Повторно кидаємо помилку для BullMQ retry механізму
                }
            },
            {
                connection: this.workerRedisClient,
                concurrency: 1,
                stalledInterval: 10 * 60 * 1000, // 10 хвилин - час до того, як job вважатиметься stalled
                maxStalledCount: 2, // Максимум stalled спроб
                lockDuration: 10 * 60 * 1000, // 10 хвилин - час блокування job під час обробки
            },
        );

        this.worker.on("completed", (job) => {
            Logger.info(
                `Job ${job.id} completed successfully`,
                undefined,
                "NamingSharingWorker",
            );
        });

        this.worker.on("failed", (job, error) => {
            if (job) {
                const attemptsMade = job.attemptsMade;
                const nextDelay =
                    attemptsMade < 3 ? namingSharingBackoff(attemptsMade) : 0;
                Logger.error(
                    `Job ${job.id} failed (attempt ${attemptsMade}/3): ${error.message}${nextDelay > 0 ? `. Next retry in ${nextDelay / 1000 / 60}min` : ""}`,
                    error.stack,
                    "NamingSharingWorker",
                );
            } else {
                Logger.error(
                    `Job failed: ${error.message}`,
                    error.stack,
                    "NamingSharingWorker",
                );
            }
        });

        this.worker.on("error", (error) => {
            // Обробляємо помилку з кастомним backoff (старий job з Redis)
            if (
                error.message &&
                error.message.includes("Unknown backoff strategy custom")
            ) {
                Logger.warn(
                    `Worker encountered job with custom backoff strategy. This is likely an old job from Redis. Consider clearing the queue.`,
                    error.stack,
                    "NamingSharingWorker",
                );
                // Не падаємо - просто логуємо попередження
                return;
            }

            Logger.error(
                `Worker error: ${error.message}`,
                error.stack,
                "NamingSharingWorker",
            );
        });

        Logger.info(
            `NamingSharingWorker started for queue: ${NAMING_SHARING_QUEUE_NAME}`,
            undefined,
            "NamingSharingWorker",
        );
    }

    async onModuleDestroy() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.workerRedisClient) {
            await this.workerRedisClient.quit();
        }
        Logger.info(
            "NamingSharingWorker stopped",
            undefined,
            "NamingSharingWorker",
        );
    }

    private async processJob(job: Job<NamingSharingJobData>): Promise<void> {
        const { campaignId, items } = job.data;
        const totalItems = items.length;
        let processed = 0;
        let totalSuccess = 0;
        let totalFailed = 0;
        const allErrors: BatchResult["errors"] = [];

        // Оновлюємо прогрес job, щоб BullMQ знав, що job ще обробляється
        await job.updateProgress(0);

        Logger.info(
            `Processing job ${job.id}: ${totalItems} items, campaignId=${campaignId}`,
            undefined,
            "NamingSharingWorker",
        );

        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(totalItems / BATCH_SIZE);

            Logger.info(
                `Batch ${batchNumber}/${totalBatches} started: ${batch.length} items`,
                undefined,
                "NamingSharingWorker",
            );

            // Оновлюємо прогрес job перед обробкою батча
            await job.updateProgress((processed / totalItems) * 100);

            const batchResult = await this.processBatch(batch, campaignId);

            processed += batch.length;
            totalSuccess += batchResult.success;
            totalFailed += batchResult.failed;
            allErrors.push(...batchResult.errors);

            Logger.info(
                `Batch ${batchNumber}/${totalBatches} completed: ${batchResult.success} success, ${batchResult.failed} failed`,
                undefined,
                "NamingSharingWorker",
            );

            // Оновлюємо прогрес job після обробки батча
            await job.updateProgress((processed / totalItems) * 100);

            this.progressGateway.sendProgress({
                jobId: job.id!,
                total: totalItems,
                processed,
                success: totalSuccess,
                failed: totalFailed,
                batchNumber,
                totalBatches,
            });

            if (batchResult.failed > 0) {
                for (const error of batchResult.errors) {
                    try {
                        Logger.error(
                            `Failed to share naming "${error.naming}" for campaign ${error.campaignId}: ${error.error}`,
                            undefined,
                            "NamingSharingWorker",
                        );
                    } catch {
                        // Якщо Logger не може записати, спробуємо ще раз через Logger
                        try {
                            Logger.error(
                                `[NamingSharingWorker] Failed to share naming "${error.naming}" for campaign ${error.campaignId}: ${error.error}`,
                                undefined,
                                "NamingSharingWorker",
                            );
                        } catch {
                            // Якщо і це не спрацювало, використовуємо console.error як останній fallback
                            console.error(
                                `[NamingSharingWorker] Failed to share naming "${error.naming}" for campaign ${error.campaignId}: ${error.error}`,
                            );
                        }
                    }
                }
            }
        }

        if (totalFailed > 0) {
            try {
                Logger.warn(
                    `Job ${job.id} completed with partial success: ${totalSuccess}/${totalItems} namings shared successfully, ${totalFailed} failed. Errors: ${allErrors.map((e) => `${e.naming}: ${e.error}`).join("; ")}`,
                    undefined,
                    "NamingSharingWorker",
                );
            } catch {
                // Якщо Logger не може записати, спробуємо ще раз через Logger
                try {
                    Logger.warn(
                        `[NamingSharingWorker] Job ${job.id} completed with partial success: ${totalSuccess}/${totalItems} namings shared successfully, ${totalFailed} failed`,
                        undefined,
                        "NamingSharingWorker",
                    );
                } catch {
                    // Якщо і це не спрацювало, використовуємо console.warn як останній fallback
                    console.warn(
                        `[NamingSharingWorker] Job ${job.id} completed with partial success: ${totalSuccess}/${totalItems} namings shared successfully, ${totalFailed} failed`,
                    );
                }
            }
            // Не кидаємо помилку - завершуємо job як успішний, але з інформацією про failed items
            // Це дозволяє worker продовжувати працювати і не падати
            // Failed items будуть показані в результаті job через WebSocket
            return;
        }

        Logger.info(
            `Job ${job.id} completed successfully: ${totalSuccess}/${totalItems} namings shared`,
            undefined,
            "NamingSharingWorker",
        );
    }

    private async processBatch(
        batch: NamingItem[],
        campaignId: number,
    ): Promise<BatchResult> {
        // Обробляємо послідовно, щоб уникнути race condition з position
        // Це відповідає поведінці старого методу shareNaming
        const results: PromiseSettledResult<void>[] = [];

        for (const item of batch) {
            try {
                await this.shareNamingWithRetry(item, campaignId);
                results.push({
                    status: "fulfilled" as const,
                    value: undefined,
                });
            } catch (error) {
                results.push({
                    status: "rejected" as const,
                    reason: error,
                });
            }
        }

        const success = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;
        const errors: BatchResult["errors"] = [];

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                errors.push({
                    naming: batch[index].naming,
                    error: result.reason?.message || String(result.reason),
                    campaignId,
                    targetCampaignId: batch[index].targetCampaignId,
                });
            }
        });

        return { success, failed, errors };
    }

    private async shareNamingWithRetry(
        item: NamingItem,
        campaignId: number,
    ): Promise<void> {
        try {
            // Використовуємо keitaroCampaign з naming, якщо він є, інакше використовуємо campaignId (appCampaignId)
            // Це дозволяє правильно знаходити stream, навіть якщо naming.keitaroCampaign змінився в CRM
            const streamCampaignId = item.keitaroCampaign || campaignId;

            Logger.info(
                `Sharing naming "${item.naming}": using campaignId=${streamCampaignId} (from naming.keitaroCampaign=${item.keitaroCampaign || "not set"}, fallback to appCampaignId=${campaignId}), targetCampaignId=${item.targetCampaignId}`,
                undefined,
                "NamingSharingWorker.shareNamingWithRetry",
            );

            const result = await this.keitaroService.shareNaming(
                streamCampaignId,
                item.naming,
                item.targetCampaignId,
            );

            if (
                result.created === 0 &&
                result.updated === 0 &&
                result.skipped === 0
            ) {
                throw new Error("Share naming returned no result");
            }
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Unknown error during share naming";
            throw new Error(
                `Failed to share naming "${item.naming}" to campaign ${item.targetCampaignId}: ${errorMessage}`,
            );
        }
    }
}
