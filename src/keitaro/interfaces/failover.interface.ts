export interface Campaign {
    id: number;
    name: string;
    group_id: number;
    [key: string]: any;
}

export interface Domain {
    id: number;
    name: string;
    default_campaign_id: number;
    group_id?: number;
    [key: string]: any;
}

export interface Offer {
    id: number;
    name: string;
    group_id: number;
    [key: string]: any;
}

export interface Stream {
    id: number;
    type: string;
    state: string;
    action_type: string;
    action_payload: string;
    schema: string;
    landings: Landing[];
    offers?: StreamOffer[];
    [key: string]: any;
}

export interface Landing {
    landing_id: number;
    [key: string]: any;
}

export interface StreamOffer {
    offer_id: number;
    group_id?: number;
    [key: string]: any;
}

export interface ReportPayload {
    range: {
        interval: string;
        timezone: string;
    };
    columns: any[];
    metrics: string[];
    grouping: string[];
    filters: ReportFilter[];
    sort: ReportSort[];
    summary: boolean;
    limit: number;
    offset: number;
    extended: boolean;
}

export interface ReportFilter {
    name: string;
    operator: string;
    expression: any;
}

export interface ReportSort {
    name: string;
    order: string;
}

export interface ReportResponse {
    rows: ReportRow[];
    [key: string]: any;
}

export interface ReportRow {
    offer_group_id: number;
    offer_id: number;
    campaign_unique_clicks: number;
    [key: string]: any;
}
