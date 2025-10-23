import { HttpException, HttpStatus } from "@nestjs/common";

import { Logger } from "./logger";
import { AxiosError } from "axios";

interface ErrorContext {
    functionName: string;
    params?: any;
    additionalData?: any;
}

export function wrapWithErrorHandler<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: ErrorContext,
) {
    return async (...args: T): Promise<R> => {
        try {
            return await fn(...args);
        } catch (error) {
            const errorData = {
                functionName: context.functionName,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    data: error.response?.data,
                },
                params: context.params || args,
                additionalData: context.additionalData,
                timestamp: new Date().toISOString(),
            };

            Logger.error(
                `Error in ${context.functionName}`,
                errorData,
                "ErrorWrapper",
            );

            if (error instanceof HttpException) {
                throw error;
            }

            if (error instanceof AxiosError) {
                const httpError = new HttpException(
                    {
                        message: `Error in ${context.functionName}`,
                        error: error.response.data,
                        statusCode: error.response.status,
                    },
                    HttpStatus.INTERNAL_SERVER_ERROR,
                );

                throw httpError;
            }

            throw error;
        }
    };
}

export function ErrorHandler(context?: Partial<ErrorContext>) {
    return function (
        target: any,
        propertyName: string,
        descriptor: PropertyDescriptor,
    ) {
        const method = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const errorContext: ErrorContext = {
                functionName: `${target.constructor.name}.${propertyName}`,
                params: args,
                ...context,
            };

            return wrapWithErrorHandler(
                method.bind(this),
                errorContext,
            )(...args);
        };
    };
}
