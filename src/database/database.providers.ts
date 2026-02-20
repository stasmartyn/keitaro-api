import { ConfigService } from "@nestjs/config";
import * as mongoose from "mongoose";

import { ConnectionDB } from "../common/enums/db-enums";
import { indexProviders } from "./providers/index.providers";

const getNodeEnv = (config: ConfigService) =>
    process.env.NODE_ENV || config.get<string>("NODE_ENV");

export const databaseProviders = [
    {
        provide: ConnectionDB.DATABASE_CONNECTION,
        inject: [ConfigService],
        useFactory: (config: ConfigService): Promise<typeof mongoose> => {
            const nodeEnv = getNodeEnv(config);

            let mongoUri: string;
            if (nodeEnv === "development") {
                mongoUri = config.get<string>("database.dev_uri");
                if (!mongoUri) {
                    throw new Error(
                        "MongoDB connection string is not defined. Please set MONGO_DATABASE_URI_DEV environment variable.",
                    );
                }
            } else {
                mongoUri = config.get<string>("database.prod_uri");
                if (!mongoUri) {
                    throw new Error(
                        "MongoDB connection string is not defined. Please set MONGO_DATABASE_URI environment variable.",
                    );
                }
            }

            return mongoose.connect(mongoUri);
        },
    },
    {
        provide: ConnectionDB.CAMPAIGN_USERS_DATABASE_CONNECTION,
        inject: [ConfigService],
        useFactory: (config: ConfigService): Promise<mongoose.Connection> => {
            const nodeEnv = getNodeEnv(config);

            let campaignUsersUri: string;
            if (nodeEnv === "development") {
                campaignUsersUri = config.get<string>(
                    "database.campaign_users_dev_uri",
                );
                if (!campaignUsersUri) {
                    throw new Error(
                        "Campaign users MongoDB URI is not defined. Please set MONGO_CAMPAIGN_USERS_DATABASE_URI_DEV environment variable.",
                    );
                }
            } else {
                campaignUsersUri = config.get<string>(
                    "database.campaign_users_prod_uri",
                );
                if (!campaignUsersUri) {
                    throw new Error(
                        "Campaign users MongoDB URI is not defined. Please set MONGO_CAMPAIGN_USERS_DATABASE_URI environment variable.",
                    );
                }
            }

            return mongoose.createConnection(campaignUsersUri).asPromise();
        },
    },
    ...indexProviders,
];
