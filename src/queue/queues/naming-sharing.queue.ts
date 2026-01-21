import { QueueOptions } from "bullmq";
import { BATCH_SIZE } from "./naming-sharing.types";

export const NAMING_SHARING_QUEUE_NAME = "naming-sharing";
export const NAMING_SHARING_BATCH_SIZE = BATCH_SIZE;

// Фіксовані інтервали backoff: 5m, 30m, 1h
const BACKOFF_DELAYS = [
    5 * 60 * 1000, // 5 хвилин
    30 * 60 * 1000, // 30 хвилин
    60 * 60 * 1000, // 1 година
];

// Кастомна функція backoff для фіксованих інтервалів
// attemptsMade: 1 (після 1-ї невдалої спроби) → 5 хв
// attemptsMade: 2 (після 2-ї невдалої спроби) → 30 хв
// attemptsMade: 3 (після 3-ї невдалої спроби) → 1 год (остання спроба)
export const namingSharingBackoff = (attemptsMade: number): number => {
    // attemptsMade починається з 1 (після першої невдалої спроби)
    if (attemptsMade === 1) {
        return BACKOFF_DELAYS[0]; // 5 хвилин
    }
    if (attemptsMade === 2) {
        return BACKOFF_DELAYS[1]; // 30 хвилин
    }
    // attemptsMade >= 3
    return BACKOFF_DELAYS[2]; // 1 година
};

export const namingSharingQueueOptions: Partial<QueueOptions> = {
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "fixed",
            delay: 60 * 60 * 1000, // 1 година для всіх attempts (замість кастомної стратегії)
        },
        // Зберігаємо останні 100 успішних та 100 невдалих для debug
        removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 години
        },
        removeOnFail: {
            count: 100,
            age: 24 * 3600, // 24 години
        },
    },
};
