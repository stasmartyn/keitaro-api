export interface KeitaroEndpointValidation {
    isValid: boolean;
    error?: string;
    message?: string;
    additionalData?: Record<string, any>;
    statusCode?: number;
}

export interface KeitaroProxyConfig {
    method: string;
    url: string;
    headers: Record<string, string>;
    timeout: number;
    data?: any;
    params?: any;
}

export interface KeitaroAllowedEndpoints {
    [key: string]: string[];
}

export interface KeitaroProxyRequest {
    method: string;
    path: string;
    headers: Record<string, string>;
    body?: any;
    query?: any;
}

export interface KeitaroProxyResponse {
    status: number;
    data: any;
    headers: Record<string, string>;
}
