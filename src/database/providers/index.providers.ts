import { Connection } from "mongoose";

import {
    ConnectionDB,
    ModelDB,
    ProvidersDB,
} from "../../common/enums/db-enums";
import { CampaignUserSchema } from "../schemas/campaign-user.model";
import { IosAppSchema } from "../schemas/ios-app.model";
import { AndroidAppSchema } from "../schemas/android-app.model";

export const indexProviders = [
    {
        provide: ProvidersDB.CAMPAIGN_USER,
        useFactory: (connection: Connection) =>
            connection.model(ModelDB.CampaignUser, CampaignUserSchema),
        inject: [ConnectionDB.DATABASE_CONNECTION],
    },
    {
        provide: ProvidersDB.IOS_APP,
        useFactory: (connection: Connection) =>
            connection.model(ModelDB.IosApp, IosAppSchema),
        inject: [ConnectionDB.DATABASE_CONNECTION],
    },
    {
        provide: ProvidersDB.ANDROID_APP,
        useFactory: (connection: Connection) =>
            connection.model(ModelDB.AndroidApp, AndroidAppSchema),
        inject: [ConnectionDB.DATABASE_CONNECTION],
    },
];
