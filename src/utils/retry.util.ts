import { Logger } from "../utils/logger";

export interface RetryOptions {
    maxAttempts?: number;
    delay?: number;
    backoff?: boolean;
    onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true, onRetry } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts) {
                Logger.error(
                    `All ${maxAttempts} retry attempts failed`,
                    "RetryUtil",
                );
                throw error;
            }

            const waitTime = backoff ? delay * attempt : delay;
            Logger.warn(
                `Attempt ${attempt}/${maxAttempts} failed: ${error.message}. Retrying in ${waitTime}ms...`,
                "RetryUtil",
            );

            if (onRetry) {
                onRetry(attempt, error);
            }

            await sleep(waitTime);
        }
    }

    throw lastError;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
