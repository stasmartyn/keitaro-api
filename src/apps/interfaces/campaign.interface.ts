export interface ICampaign {
    id: number;
    name: string;
    alias: string;
    token: string;
    traffic_source_id: number;
    group_id: number;
    parameters?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICampaignCreate {
    name: string;
    alias: string;
    traffic_source_id: number;
    group_id: number;
    sub_id?: string;
}

export interface ICampaignUpdate {
    name?: string;
    alias?: string;
    traffic_source_id?: number;
    group_id?: number;
    parameters?: Record<string, any>;
}

export interface ICampaignCopy {
    id: number;
    group_id: number;
    name: string;
    sub_id?: string;
    change_parameters?: boolean;
}
