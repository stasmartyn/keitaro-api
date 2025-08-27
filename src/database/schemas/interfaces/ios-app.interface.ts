export interface IIosApp {
    name: string | null;
    keitaroID: string | null;
    bundleID: string | null;
    appID: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IIosAppCreate {
    name?: string | null;
    keitaroID?: string | null;
    bundleID?: string | null;
    appID?: string | null;
}

export interface IIosAppUpdate {
    name?: string | null;
    keitaroID?: string | null;
    bundleID?: string | null;
    appID?: string | null;
}
