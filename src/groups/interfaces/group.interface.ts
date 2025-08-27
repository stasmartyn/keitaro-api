export interface IGroup {
    id: number;
    name: string;
    type: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IGroupCreate {
    name: string;
    type: string;
}

export interface IGroupUpdate {
    name?: string;
    type?: string;
}

export interface IGroupQuery {
    type: string;
}
