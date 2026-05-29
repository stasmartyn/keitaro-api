import { HttpException, HttpStatus } from "@nestjs/common";

import { Logger } from "./logger";
import { AxiosError } from "axios";

interface ErrorContext {
    functionName: string;
    params?: any;
    additionalData?: any;
}

function extractUnderlyingErrorDetail(
    error: unknown,
    responseData?: unknown,
): string | null {
    if (error instanceof AxiosError) {
        const data = responseData ?? error.response?.data;

        if (typeof data === "string" && data.trim() !== "") {
            return data.trim();
        }

        if (data && typeof data === "object") {
            const record = data as Record<string, unknown>;

            for (const key of ["message", "error", "errors"]) {
                const value = record[key];

                if (typeof value === "string" && value.trim() !== "") {
                    const trimmed = value.trim();
                    if (!trimmed.startsWith("Error in ")) {
                        return trimmed;
                    }
                }

                if (Array.isArray(value) && value.length > 0) {
                    return value.map(String).join(", ");
                }
            }
        }
    }

    if (error instanceof Error && error.message.trim() !== "") {
        const trimmed = error.message.trim();
        if (!trimmed.startsWith("Error in ")) {
            return trimmed;
        }
    }

    return null;
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

            const underlyingDetail = extractUnderlyingErrorDetail(
                error,
                responseData,
            );
            const errorMessage = underlyingDetail
                ? `Error in ${functionNameOnly}: ${underlyingDetail}`
                : `Error in ${functionNameOnly}`;

            Logger.error(errorMessage, errorData, "ErrorWrapper");

            if (error instanceof HttpException) {
                throw error;
            }

            if (error instanceof AxiosError) {
                const originalStatus =
                    error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
                const httpError = new HttpException(
                    {
                        message: errorMessage,
                        functionName: functionNameOnly,
                        requestUrl,
                        error: error.response?.data || error.message,
                        statusCode: originalStatus,
                    },
                    originalStatus,
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
