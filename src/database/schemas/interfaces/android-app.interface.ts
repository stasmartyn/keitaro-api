export interface IAndroidApp {
    name: string | null;
    keitaroID: string | null;
    bundleID: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IAndroidAppCreate {
    name?: string | null;
    keitaroID?: string | null;
    bundleID?: string | null;
}

export interface IAndroidAppUpdate {
    name?: string | null;
    keitaroID?: string | null;
    bundleID?: string | null;
    appID?: string | null;
}
