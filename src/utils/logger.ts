import * as pino from "pino";

const consoleLogger = pino({
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            levelFirst: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
            messageFormat: "{msg}",
        },
    },
});

const fileLogger = pino(
    {
        level: "error",
    },
    pino.transport({
        target: "pino-pretty",
        options: {
            colorize: false,
            levelFirst: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            messageFormat: "{msg}",
            destination: "./logs/errors.log",
        },
    }),
);

export class Logger {
    static info(message: string, data?: any, context?: string) {
        const logMessage = context ? `[${context}] ${message}` : message;
        consoleLogger.info({ data }, logMessage);
    }

    static error(message: string, data?: any, context?: string) {
        const logMessage = context ? `[${context}] ${message}` : message;
        const errorData = {
            message: logMessage,
            type: "ERROR",
            timestamp: new Date().toISOString(),
            context: context || "Application",
            ...(data && { data }),
        };

        consoleLogger.error(errorData);
        fileLogger.error(errorData);
    }

    static warn(message: string, data?: any, context?: string) {
        const logMessage = context ? `[${context}] ${message}` : message;
        consoleLogger.warn({ data }, logMessage);
    }

    static debug(message: string, data?: any, context?: string) {
        const logMessage = context ? `[${context}] ${message}` : message;
        consoleLogger.debug({ data }, logMessage);
    }

    static verbose(message: string, data?: any, context?: string) {
        const logMessage = context ? `[${context}] ${message}` : message;
        consoleLogger.trace({ data }, logMessage);
    }
}
