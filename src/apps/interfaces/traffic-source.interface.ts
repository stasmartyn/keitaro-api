export interface ITrafficSource {
    id: number;
    name: string;
    sub_id?: string;
    postback_url: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ITrafficSourceCreate {
    name: string;
    sub_id?: string;
    postback_url: string;
}

export interface ITrafficSourceUpdate {
    name?: string;
    sub_id?: string;
    postback_url?: string;
}
