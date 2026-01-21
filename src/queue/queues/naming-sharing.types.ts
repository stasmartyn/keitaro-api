/**
 * Контракт для job payload в черзі naming-sharing
 * Підтримує batching по 10 items
 */

export interface NamingItem {
    naming: string;
    targetCampaignId: number;
}

export interface NamingSharingJobData {
    campaignId: number;
    appId?: number;
    items: NamingItem[];
}

export const BATCH_SIZE = 10;
