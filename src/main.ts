import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { Logger } from "./utils/logger";
import { Request, Response, NextFunction } from "express";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ["error", "warn", "log", "debug", "verbose"],
    });

    app.use((req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        res.send = function (data) {
            if (res.statusCode >= 400) {
                Logger.error(
                    `HTTP Error ${res.statusCode}`,
                    {
                        method: req.method,
                        url: req.url,
                        statusCode: res.statusCode,
                        body: req.body,
                        response: data,
                    },
                    "HTTP",
                );
            }
            return originalSend.call(this, data);
        };
        next();
    });

    app.setGlobalPrefix("api");

    await app.listen(5006);
    Logger.info(
        "Application is running",
        { port: 5005, prefix: "api" },
        "Bootstrap",
    );
}
bootstrap();
