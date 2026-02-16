/**
 * Internal interfaces for FailoverService
 * These types are used internally within the failover logic
 */

export interface FailoverConfig {
    campaignGroupId: number;
    bannedCampaignGroupId: number;
    minCampaignId: number;
    pageSize: number;
    defaultCampaignId: number;
    bannedDomainGroupId: number;
    privateOfferGroupId: number;
    publicOfferGroupId: number;
    bannedOfferGroupId: number;
    defaultStreamId: number;
    expectedLandingId: number;
}

export interface CampaignResult {
    campaigns: any[];
    campaignsPreview: any[];
}

export interface DomainResult {
    domainsToUpdate: any[];
    domainsPreview: any[];
}

export interface OfferResult {
    offersToUpdate: any[];
    offersPreview: any[];
    bannedOfferIds: number[];
}

export interface StreamResult {
    configIssues: string[];
    currentOfferDetails: any;
    willReplaceOffer: boolean;
    replacementOffer: any;
    /** Set when step 4 failed (e.g. stream 404) after retries */
    error?: string;
}
