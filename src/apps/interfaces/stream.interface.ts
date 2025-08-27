export interface IStream {
    id: number;
    type: string;
    name: string;
    campaign_id: number;
    position: number;
    state: string;
    action_type: string;
    action_payload: string;
    schema: string;
    collect_clicks: boolean;
    filter_or: boolean;
    weight: number;
    offer_selection: string;
    filters: any[];
    triggers: any[];
    landings: IStreamLanding[];
    offers: IStreamOffer[];
    comments?: string;
    action_options?: any;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IStreamLanding {
    landing_id: number;
    state: string;
    share: number;
    created_at?: string;
    updated_at?: string;
}

export interface IStreamOffer {
    offer_id: number;
    state: string;
    share: number;
    created_at?: string;
    updated_at?: string;
}

export interface IStreamCreate {
    type: string;
    name: string;
    campaign_id: number;
    position: number;
    state: string;
    action_type: string;
    action_payload: string;
    schema: string;
    collect_clicks: boolean;
    filter_or: boolean;
    weight: number;
    offer_selection: string;
    filters: any[];
    triggers: any[];
    landings: IStreamLanding[];
    offers: IStreamOffer[];
    comments?: string;
    action_options?: any;
}
