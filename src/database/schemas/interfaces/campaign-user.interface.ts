export interface ICampaignUser {
    nickName: string | null;
    group_id: string | null;
    sub: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ICampaignUserCreate {
    nickName?: string | null;
    group_id?: string | null;
    sub?: string | null;
}

export interface ICampaignUserUpdate {
    nickName?: string | null;
    group_id?: string | null;
    sub?: string | null;
}
