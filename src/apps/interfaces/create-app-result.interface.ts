export interface CreateAppResultInterface {
    trafficSourceId: number;
    orgCampaign?: {
        campaignId: number;
        campaignToken: string;
        campaignAlias: string;
        orgFalseId: number;
    };
    cloCampaign: {
        campaignId: number;
        campaignToken: string;
        campaignAlias: string;
        clTrueId: number;
        clFalseId: number;
    };
}
