import { QueueOptions } from "bullmq";

export const NAMING_SHARING_DLQ_QUEUE_NAME = "naming-sharing-dlq";

// DLQ черга - зберігаємо jobs довше для аналізу
export const namingSharingDlqQueueOptions: Partial<QueueOptions> = {
    defaultJobOptions: {
        // В DLQ не робимо retry - це остаточно failed jobs
        attempts: 1,
        // Зберігаємо більше failed jobs для аналізу
        removeOnFail: {
            count: 1000, // Останні 1000 failed jobs
            age: 7 * 24 * 3600, // 7 днів
        },
        // Успішних jobs в DLQ не буде (це тільки для failed)
        removeOnComplete: false,
    },
};
