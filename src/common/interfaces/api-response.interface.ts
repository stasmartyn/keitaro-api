export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    timestamp: string;
    path: string;
    method: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface ErrorResponse {
    success: false;
    error: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    details?: any;
}
