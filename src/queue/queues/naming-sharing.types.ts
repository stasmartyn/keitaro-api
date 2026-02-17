/**
 * Контракт для job payload в черзі naming-sharing
 * Підтримує batching по 10 items
 */

export interface NamingItem {
    naming: string;
    targetCampaignId: number;
    keitaroCampaign?: number; // Кампанія, в якій має бути stream (naming.keitaroCampaign з CRM)
    oldKeitaroCampaign?: number; // Стара кампанія для міграції stream (якщо keitaroCampaign змінився)
}

export interface NamingSharingJobData {
    campaignId: number;
    appId?: number;
    items: NamingItem[];
}

export const BATCH_SIZE = 10;

/**
 * WebSocket progress notification для naming-sharing
 */
export interface NamingSharingProgress {
    jobId: string;
    total: number;
    processed: number;
    success: number;
    failed: number;
    batchNumber: number;
    totalBatches: number;
}

/**
 * Результат обробки батча naming items
 */
export interface BatchResult {
    success: number;
    failed: number;
    errors: Array<{
        naming: string;
        error: string;
        campaignId: number;
        targetCampaignId: number;
    }>;
    results: Array<{
        naming: string;
        success: boolean;
        created?: number;
        updated?: number;
        skipped?: number;
        error?: string;
    }>;
}

/**
 * Дані для Dead Letter Queue (DLQ)
 */
export interface DlqJobData {
    originalJobId: string;
    originalJobName: string;
    originalData: any;
    failedReason: string;
    failedStack?: string;
    attemptsMade: number;
    timestamp: string;
    metadata?: Record<string, any>;
}
