import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Worker, Job } from "bullmq";
import { QueueService } from "../queue.service";
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
    NamingSharingResult,
} from "../queues/naming-sharing.types";
import { NamingSharingProgressGateway } from "../gateways/naming-sharing-progress.gateway";

@Injectable()
export class NamingSharingWorker implements OnModuleInit, OnModuleDestroy {
    private worker: Worker | null = null;

    constructor(
        private readonly queueService: QueueService,
        private readonly configService: ConfigService,
        private readonly keitaroService: KeitaroService,
        private readonly progressGateway: NamingSharingProgressGateway,
    ) {}

    async onModuleInit() {
        // BullMQ Worker вимагає connection options з maxRetriesPerRequest: null
        const redisConfig = this.configService.get("redis");
        const connectionOptions = redisConfig.url
            ? { url: redisConfig.url, maxRetriesPerRequest: null }
            : {
                  host: redisConfig.host,
                  port: redisConfig.port,
                  db: redisConfig.db,
                  maxRetriesPerRequest: null,
                  ...(redisConfig.password && {
                      password: redisConfig.password,
                  }),
                  ...(redisConfig.username && {
                      username: redisConfig.username,
                  }),
                  ...(redisConfig.tls && { tls: {} }),
              };

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
                connection: connectionOptions as any,
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
        const allResults: NamingSharingResult[] = [];

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
            if (batchResult.results) {
                allResults.push(...batchResult.results);
            }

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
            this.sendCompleteEvent(
                job.id!,
                totalItems,
                totalSuccess,
                totalFailed,
                allResults,
            );
            return;
        }

        Logger.info(
            `Job ${job.id} completed successfully: ${totalSuccess}/${totalItems} namings shared`,
            undefined,
            "NamingSharingWorker",
        );

        this.sendCompleteEvent(
            job.id!,
            totalItems,
            totalSuccess,
            totalFailed,
            allResults,
        );
    }

    private async processBatch(
        batch: NamingItem[],
        campaignId: number,
    ): Promise<BatchResult> {
        // Обробляємо послідовно, щоб уникнути race condition з position
        // Це відповідає поведінці старого методу shareNaming
        type ShareNamingResult = {
            created: number;
            updated: number;
            skipped: number;
        };
        const results: PromiseSettledResult<ShareNamingResult>[] = [];

        for (const item of batch) {
            try {
                const result = await this.shareNamingWithRetry(
                    item,
                    campaignId,
                );
                results.push({
                    status: "fulfilled" as const,
                    value: result,
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
        const batchResults: BatchResult["results"] = [];

        results.forEach((result, index) => {
            const item = batch[index];
            if (result.status === "fulfilled") {
                const value = result.value;
                batchResults.push({
                    naming: item.naming,
                    success: true,
                    created: value.created,
                    updated: value.updated,
                    skipped: value.skipped,
                });
            } else {
                const errorMessage =
                    result.reason instanceof Error
                        ? result.reason.message
                        : result.reason
                          ? String(result.reason)
                          : "Unknown error";
                errors.push({
                    naming: item.naming,
                    error: errorMessage,
                    campaignId,
                    targetCampaignId: item.targetCampaignId,
                });
                batchResults.push({
                    naming: item.naming,
                    success: false,
                    error: errorMessage,
                });
            }
        });

        return { success, failed, errors, results: batchResults };
    }

    private async shareNamingWithRetry(
        item: NamingItem,
        campaignId: number,
    ): Promise<{
        created: number;
        updated: number;
        skipped: number;
    }> {
        try {
            // Stream завжди створюється в APP кампанії (campaignId)
            // keitaroCampaign використовується лише для міграції stream при зміні кампанії
            const streamCampaignId = campaignId;

            Logger.info(
                `Sharing naming "${item.naming}": stream will be created in APP campaign ${streamCampaignId}, will redirect to ${item.targetCampaignId} (buyer/org campaign), keitaroCampaign from naming=${item.keitaroCampaign || "not set"}`,
                undefined,
                "NamingSharingWorker.shareNamingWithRetry",
            );

            const result = await this.keitaroService.shareNaming(
                streamCampaignId, // APP кампанія - де створюється stream
                item.naming,
                item.targetCampaignId, // Байерська або ORG кампанія - куди редіректить
                item.oldKeitaroCampaign, // Стара кампанія для міграції stream
            );

            if (
                result.created === 0 &&
                result.updated === 0 &&
                result.skipped === 0
            ) {
                throw new Error("Share naming returned no result");
            }

            return {
                created: result.created,
                updated: result.updated,
                skipped: result.skipped,
            };
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

    private sendCompleteEvent(
        jobId: string,
        total: number,
        success: number,
        failed: number,
        results: NamingSharingResult[],
    ): void {
        this.progressGateway.sendComplete({
            jobId,
            total,
            success,
            failed,
            results,
        });
    }
}
