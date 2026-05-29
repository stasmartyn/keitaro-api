import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
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

    app.use((_req: Request, res: Response, next: NextFunction) => {
        const originalSend = res.send;
        res.send = function (data) {
            return originalSend.call(this, data);
        };
        next();
    });

    app.enableCors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    });

    app.setGlobalPrefix("api");
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    await app.listen(port);
    Logger.info("Application is running", { port, prefix: "api" }, "Bootstrap");
}
bootstrap();
