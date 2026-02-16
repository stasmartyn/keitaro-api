import { IsString, IsNotEmpty } from "class-validator";

export class AppBannedDto {
    @IsString()
    @IsNotEmpty()
    platform: string;

    @IsString()
    @IsNotEmpty()
    app_id: string;
}

export class PreviewResponseDto {
    summary: {
        appId: string;
        platform: string;
        totalOperations: number;
    };
    step1_campaigns: {
        found: number;
        campaigns: Array<{
            id: number;
            name: string;
            currentGroupId: number;
            willMoveToGroupId: number;
        }>;
    };
    step2_domains: {
        found: number;
        domains: Array<{
            id: number;
            name: string;
            currentCampaignId: number;
            currentGroupId: number;
            willSetCampaignId: number;
            willSetGroupId: number;
        }>;
    };
    step3_offers: {
        found: number;
        offers: Array<{
            id: number;
            name: string;
            currentGroupId: number;
            willMoveToGroupId: number;
        }>;
    };
    step4_stream: {
        streamId: number;
        campaignId: number;
        configValid: boolean;
        configIssues?: string[];
        /** Present when step 4 failed (e.g. stream not found 404) */
        error?: string;
        currentOffer: {
            id: number;
            name: string;
            groupId: number;
            isBanned: boolean;
        };
        willReplaceOffer: boolean;
        replacementOffer?: {
            id: number;
            name: string;
            groupId: number;
            clicks: number;
            reason: string;
        };
    };
}
