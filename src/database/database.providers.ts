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
            if (nodeEnv === "development") {
                return mongoose.connect(config.get<string>("database.dev_uri"));
            }
            return mongoose.connect(config.get<string>("database.prod_uri"));
        },
    },
    ...indexProviders,
];
