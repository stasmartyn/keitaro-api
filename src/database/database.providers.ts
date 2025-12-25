import { ConfigService } from "@nestjs/config";
import * as mongoose from "mongoose";

import { ConnectionDB } from "../common/enums/db-enums";
import { indexProviders } from "./providers/index.providers";

export const databaseProviders = [
    {
        provide: ConnectionDB.DATABASE_CONNECTION,
        inject: [ConfigService],
        useFactory: (config: ConfigService): Promise<typeof mongoose> => {
            const nodeEnv =
                process.env.NODE_ENV || config.get<string>("NODE_ENV");

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
    ...indexProviders,
];
