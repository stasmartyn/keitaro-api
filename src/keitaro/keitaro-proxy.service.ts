import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Request, Response } from "express";

import { Logger } from "../utils/logger";
import {
    KeitaroAllowedEndpoints,
    KeitaroEndpointValidation,
    KeitaroProxyConfig,
} from "./interfaces/keitaro-proxy.interface";

@Injectable()
export class KeitaroProxyService {
    private readonly ALLOWED_ENDPOINTS: KeitaroAllowedEndpoints = {
        campaigns: ["GET"],
        domains: ["GET"],
        streams: ["GET"],
        "report/build": ["POST"],
    };

    constructor(private readonly configService: ConfigService) {}

    async proxyRequest(req: Request, res: Response) {
        try {
            const validationResult = this.validateKeitaroEndpoint(req);
            if (!validationResult.isValid) {
                throw new HttpException(
                    {
                        error: validationResult.error,
                        message: validationResult.message,
                        ...validationResult.additionalData,
                    },
                    validationResult.statusCode,
                );
            }

            const response = await this.proxyToKeitaro(req);

            res.status(response.status).json(response.data);
        } catch (error) {
            this.handleProxyError(error, res);
        }
    }

    private validateKeitaroEndpoint(req: Request): KeitaroEndpointValidation {
        const path = req.path.substring(1);
        const method = req.method.toUpperCase();

        let matchedEndpoint = null;
        let allowedMethods = [];

        for (const [endpoint, methods] of Object.entries(
            this.ALLOWED_ENDPOINTS,
        )) {
            if (path === endpoint || path.startsWith(endpoint + "/")) {
                matchedEndpoint = endpoint;
                allowedMethods = methods;
                break;
            }
        }

        if (!matchedEndpoint) {
            return {
                isValid: false,
                error: "Endpoint not allowed",
                message: `Endpoint '${path}' is not in the allowed list`,
                additionalData: {
                    allowedEndpoints: Object.keys(this.ALLOWED_ENDPOINTS),
                },
                statusCode: HttpStatus.FORBIDDEN,
            };
        }

        if (!allowedMethods.includes(method)) {
            return {
                isValid: false,
                error: "Method not allowed",
                message: `Method '${method}' is not allowed for endpoint '${matchedEndpoint}'`,
                additionalData: {
                    allowedMethods: allowedMethods,
                    endpoint: matchedEndpoint,
                },
                statusCode: HttpStatus.METHOD_NOT_ALLOWED,
            };
        }

        return { isValid: true };
    }

    private async proxyToKeitaro(req: Request) {
        const path = req.path.substring(1);
        const nodeEnv = this.configService.get("NODE_ENV");
        const keitaroDomain = this.configService.get("keitaro.keitaroDomain");
        const keitaroApiKey = this.configService.get("keitaro.apiKey");
        const keitaroApiKeyDev = this.configService.get("keitaro.apiKeyDev");

        const keitaroUrl = `${keitaroDomain}/admin_api/v1/${path}`;

        const headers = {
            "Api-Key":
                nodeEnv === "production" ? keitaroApiKey : keitaroApiKeyDev,
            "Content-Type": "application/json",
        };

        const config: KeitaroProxyConfig = {
            method: req.method,
            url: keitaroUrl,
            headers: headers,
            timeout: 30000,
        };

        if (req.method !== "GET") {
            config["data"] = req.body;
        } else {
            config["params"] = req.query;
        }

        Logger.info(
            `Proxying request to Keitaro`,
            {
                method: req.method,
                url: keitaroUrl,
                path: path,
            },
            "KeitaroProxyService",
        );

        return await axios(config);
    }

    private handleProxyError(error: any, res: Response) {
        Logger.error(
            "Keitaro proxy error",
            {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data,
            },
            "KeitaroProxyService",
        );

        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.code === "ECONNABORTED") {
            res.status(HttpStatus.GATEWAY_TIMEOUT).json({
                error: "Gateway timeout",
                message: "Request to Keitaro API timed out",
            });
        } else if (error instanceof HttpException) {
            res.status(error.getStatus()).json(error.getResponse());
        } else {
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                error: "Internal server error",
                message: error.message,
            });
        }
    }
}
