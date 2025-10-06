import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { Logger } from "./utils/logger";
import { Request, Response, NextFunction } from "express";
import { ConfigService } from "@nestjs/config";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: ["error", "warn", "log", "debug", "verbose"],
    });

    const configService = app.get(ConfigService);
    const port = configService.get<number>("port");

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

    await app.listen(port);
    Logger.info("Application is running", { port, prefix: "api" }, "Bootstrap");
}
bootstrap();
