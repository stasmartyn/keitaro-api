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
            let requestUrl: string | undefined;
            let keitaroMethodName: string | undefined;

            if (
                (error as any)?.isKeitaroError &&
                (error as any)?.keitaroMethod
            ) {
                keitaroMethodName = (error as any).keitaroMethod;
            }

            if (error instanceof AxiosError) {
                const baseURL = error.config?.baseURL || "";
                const url = error.config?.url || "";
                requestUrl = url.startsWith("http") ? url : `${baseURL}${url}`;
            }

            const functionNameParts = context.functionName.split(".");
            let functionNameOnly =
                functionNameParts.length > 1
                    ? functionNameParts[functionNameParts.length - 1]
                    : context.functionName;

            if (keitaroMethodName) {
                functionNameOnly = keitaroMethodName;
            }

            const responseData =
                error instanceof AxiosError ? error.response?.data : undefined;

            // Якщо є streamParams в помилці (з KeitaroService), використовуємо їх замість args
            const streamParams = (error as any)?.streamParams;
            const paramsToLog = streamParams || context.params || args;

            const errorData = {
                functionName: context.functionName,
                functionNameOnly,
                ...(keitaroMethodName && { keitaroMethod: keitaroMethodName }),
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    data: responseData,
                },
                ...(requestUrl && { requestUrl }),
                params: paramsToLog,
                additionalData: context.additionalData,
                timestamp: new Date().toISOString(),
            };

            const errorMessage = `Error in ${functionNameOnly}`;

            Logger.error(errorMessage, errorData, "ErrorWrapper");

            if (error instanceof HttpException) {
                throw error;
            }

            if (error instanceof AxiosError) {
                const httpError = new HttpException(
                    {
                        message: errorMessage,
                        functionName: functionNameOnly,
                        requestUrl,
                        error: error.response?.data || error.message,
                        statusCode: error.response?.status || 500,
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
