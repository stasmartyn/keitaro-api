export type DatabaseType = "mongodb" | "postgresql" | "mysql";

export type LogLevel = "error" | "warn" | "info" | "debug" | "verbose";

export type AuthStrategy = "jwt" | "bearer" | "api-key";

export interface DatabaseConfig {
    type: DatabaseType;
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

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
