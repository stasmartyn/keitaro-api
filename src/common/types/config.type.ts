export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";

export type AuthStrategy = "jwt" | "bearer" | "api-key";

export interface AuthConfig {
    strategy: AuthStrategy;
    token?: string;
    secret?: string;
    expiresIn?: string;
}

export interface LoggingConfig {
    level: LogLevel;
    format: "json" | "simple";
    timestamp: boolean;
}
