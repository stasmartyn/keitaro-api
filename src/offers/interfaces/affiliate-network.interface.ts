export interface IAffiliateNetwork {
    id: number;
    name: string;
    postback_url: string;
    offer_param?: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAffiliateNetworkCreate {
    name: string;
    postback_url: string;
    offer_param?: string;
    notes?: string;
}

export interface IAffiliateNetworkUpdate {
    name?: string;
    postback_url?: string;
    offer_param?: string;
    notes?: string;
}
