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
                params: context.params || args,
                additionalData: context.additionalData,
                timestamp: new Date().toISOString(),
            };

            const errorMessage = `Error in ${functionNameOnly}`;

            Logger.error(errorMessage, errorData, "ErrorWrapper");

            if (error instanceof HttpException) {
                throw error;
            }

            if (error instanceof AxiosError) {
                let errorMessageFromResponse: string | object = error.message;
                const responseData = error.response?.data;

                if (responseData) {
                    if (
                        typeof responseData === "object" &&
                        !Array.isArray(responseData)
                    ) {
                        const errorMessages: string[] = [];
                        for (const key in responseData) {
                            if (Array.isArray(responseData[key])) {
                                errorMessages.push(
                                    ...responseData[key].map(
                                        (msg: string) => `${key}: ${msg}`,
                                    ),
                                );
                            } else if (typeof responseData[key] === "string") {
                                errorMessages.push(
                                    `${key}: ${responseData[key]}`,
                                );
                            }
                        }
                        if (errorMessages.length > 0) {
                            errorMessageFromResponse = errorMessages.join(", ");
                        } else {
                            errorMessageFromResponse = responseData;
                        }
                    } else if (typeof responseData === "string") {
                        errorMessageFromResponse = responseData;
                    } else {
                        errorMessageFromResponse = responseData;
                    }
                }

                const statusCode = error.response?.status || 500;
                const httpStatus =
                    statusCode >= 400 && statusCode < 500
                        ? HttpStatus.BAD_REQUEST
                        : HttpStatus.INTERNAL_SERVER_ERROR;

                const httpError = new HttpException(
                    {
                        message: errorMessageFromResponse,
                        functionName: functionNameOnly,
                        requestUrl,
                        error: errorMessageFromResponse,
                        statusCode,
                    },
                    httpStatus,
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
