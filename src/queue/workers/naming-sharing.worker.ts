import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { ConfigService } from "@nestjs/config";
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
} from "../queues/naming-sharing.types";
import { NamingSharingProgressGateway } from "../gateways/naming-sharing-progress.gateway";

interface BatchResult {
    success: number;
    failed: number;
    errors: Array<{
        naming: string;
        error: string;
        campaignId: number;
        targetCampaignId: number;
    }>;
}

@Injectable()
export class NamingSharingWorker implements OnModuleInit, OnModuleDestroy {
    private worker: Worker | null = null;

    private workerRedisClient: Redis | null = null;

    constructor(
        private readonly queueService: QueueService,
        private readonly redisService: RedisService,
        private readonly keitaroService: KeitaroService,
        private readonly progressGateway: NamingSharingProgressGateway,
        private readonly configService: ConfigService,
    ) {}

    async onModuleInit() {
        const redisConfig = this.configService.get("redis");

        if (redisConfig.url) {
            this.workerRedisClient = new Redis(redisConfig.url, {
                maxRetriesPerRequest: null,
            });
        } else {
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

            this.workerRedisClient = new Redis(options);
        }

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
                        // Якщо Logger не може записати, використовуємо console.error як fallback
                        console.error(
                            `[NamingSharingWorker] Failed to process job ${job.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
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
                        // Fallback якщо Logger не може записати
                        console.error(
                            `[NamingSharingWorker] Failed to share naming "${error.naming}" for campaign ${error.campaignId}: ${error.error}`,
                        );
                    }
                }
            }
        }

        if (totalFailed > 0) {
            const errorMessage = `Failed to share ${totalFailed} out of ${totalItems} namings. Errors: ${allErrors.map((e) => `${e.naming}: ${e.error}`).join(", ")}`;
            try {
                Logger.error(
                    `Job ${job.id} completed with errors: ${errorMessage}`,
                    undefined,
                    "NamingSharingWorker",
                );
            } catch {
                // Fallback якщо Logger не може записати
                console.error(
                    `[NamingSharingWorker] Job ${job.id} completed with errors: ${errorMessage}`,
                );
            }
            throw new Error(errorMessage);
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
            const result = await this.keitaroService.shareNaming(
                campaignId,
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
