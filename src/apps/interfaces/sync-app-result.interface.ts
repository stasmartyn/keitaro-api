export interface SyncAppResultInterface {
    success: boolean;
    updates: Array<{
        type:
            | "traffic_source"
            | "clo_campaign"
            | "clo_campaign_source_update"
            | "naming_stream_create"
            | "naming_stream_update"
            | "naming_stream_delete";
        id: string | number | null;
        naming?: string;
        success: boolean;
        data?: any;
        error?: string;
    }>;
    errors: string[];
}
