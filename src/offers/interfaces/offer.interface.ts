export interface IOffer {
    id: number;
    name: string;
    group_id: number;
    offer_type: string;
    action_type: string;
    action_payload: string;
    affiliate_network_id: number;
    payout_value: number;
    payout_currency: string;
    payout_type: string;
    state: string;
    payout_auto: boolean;
    payout_upsell: boolean;
    country: string[];
    notes: string;
    archive: Record<string, any>;
    conversion_cap_enabled: boolean;
    daily_cap: number;
    conversion_timezone: string;
    alternative_offer_id: number;
    action_options?: any[];
    values?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IOfferCreate {
    name: string;
    group_id: number;
    offer_type: string;
    action_type: string;
    action_payload: string;
    affiliate_network_id: number;
    payout_value: number;
    payout_currency: string;
    payout_type: string;
    state: string;
    payout_auto: boolean;
    payout_upsell: boolean;
    country: string[];
    notes: string;
    archive: Record<string, any>;
    conversion_cap_enabled: boolean;
    daily_cap: number;
    conversion_timezone: string;
    alternative_offer_id: number;
    action_options?: any[];
    values?: string;
}

export interface IOfferUpdate {
    name?: string;
    group_id?: number;
    offer_type?: string;
    action_type?: string;
    action_payload?: string;
    affiliate_network_id?: number;
    payout_value?: number;
    payout_currency?: string;
    payout_type?: string;
    state?: string;
    payout_auto?: boolean;
    payout_upsell?: boolean;
    country?: string[];
    notes?: string;
    archive?: Record<string, any>;
    conversion_cap_enabled?: boolean;
    daily_cap?: number;
    conversion_timezone?: string;
    alternative_offer_id?: number;
    action_options?: any[];
    values?: string;
}
