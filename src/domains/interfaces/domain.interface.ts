export interface IDomain {
    id: number;
    name: string;
    group_id: number;
    ssl_redirect: boolean;
    allow_indexing: boolean;
    admin_dashboard: boolean;
    catch_not_found: boolean;
    default_campaign_id: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IDomainCreate {
    name: string;
    group_id: number;
    ssl_redirect?: boolean;
    allow_indexing?: boolean;
    admin_dashboard?: boolean;
    catch_not_found?: boolean;
    default_campaign_id?: number;
}

export interface IDomainUpdate {
    name?: string;
    group_id?: number;
    ssl_redirect?: boolean;
    allow_indexing?: boolean;
    admin_dashboard?: boolean;
    catch_not_found?: boolean;
    default_campaign_id?: number;
}

export interface IOneLinkSettings {
    catch_not_found?: boolean;
    default_campaign_id?: number;
}
