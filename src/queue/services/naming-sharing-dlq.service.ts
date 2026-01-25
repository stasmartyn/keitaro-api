import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { QueueService } from "../queue.service";
import { Job } from "bullmq";
import { Logger } from "../../utils/logger";
import { NAMING_SHARING_QUEUE_NAME } from "../queues/naming-sharing.queue";
import { DlqJobData } from "../queues/naming-sharing.types";

@Injectable()
export class NamingSharingDlqService implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly queueService: QueueService) {}

    async onModuleInit() {
        const mainQueue = this.queueService.getNamingSharingQueue();

        // Підписуємося на подію 'failed' - коли job остаточно впав
        // Використовуємо type assertion, бо BullMQ TypeScript типи не повністю підтримують всі події
        // Альтернатива: використати QueueEvents API, але це складніше для нашої задачі
        mainQueue.on(
            "failed" as any,
            async (job: Job<any, any, string>, error: Error) => {
                await this.handleFailedJob(job, error);
            },
        );

        Logger.info(
            `DLQ listener registered for queue: ${NAMING_SHARING_QUEUE_NAME}`,
            undefined,
            "NamingSharingDlqService",
        );
    }

    async onModuleDestroy() {
        // Cleanup виконується автоматично через QueueService
    }

    /**
     * Обробляє failed job та перекидає його в DLQ
     */
    private async handleFailedJob(job: Job, error: Error): Promise<void> {
        try {
            // Перевіряємо, чи job впав після всіх спроб
            const attemptsMade = job.attemptsMade || 0;
            const maxAttempts = job.opts.attempts || 3;

            // Перекидаємо в DLQ тільки якщо всі спроби вичерпано
            if (attemptsMade >= maxAttempts) {
                const dlqQueue = this.queueService.getNamingSharingDlqQueue();

                const dlqJobData: DlqJobData = {
                    originalJobId: job.id!,
                    originalJobName: job.name,
                    originalData: job.data,
                    failedReason: error.message,
                    failedStack: error.stack,
                    attemptsMade,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        processedOn: job.processedOn,
                        finishedOn: job.finishedOn,
                        timestamp: job.timestamp,
                        opts: {
                            attempts: job.opts.attempts,
                            backoff: job.opts.backoff,
                        },
                    },
                };

                await dlqQueue.add("failed-naming-sharing-job", dlqJobData, {
                    jobId: `dlq-${job.id}-${Date.now()}`,
                });

                Logger.warn(
                    `Job ${job.id} moved to DLQ after ${attemptsMade} attempts. Error: ${error.message}`,
                    error.stack,
                    "NamingSharingDlqService",
                );
            }
        } catch (dlqError) {
            Logger.error(
                `Failed to move job ${job.id} to DLQ: ${dlqError instanceof Error ? dlqError.message : "Unknown error"}`,
                dlqError instanceof Error ? dlqError.stack : undefined,
                "NamingSharingDlqService",
            );
        }
    }

    /**
     * Отримує DLQ чергу для ручного доступу
     */
    getDlqQueue() {
        return this.queueService.getNamingSharingDlqQueue();
    }
}
