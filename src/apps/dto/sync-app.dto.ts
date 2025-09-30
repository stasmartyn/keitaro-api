import { IsString, IsOptional, IsEnum } from "class-validator";

export enum Platform {
    IOS = "IOS",
    ANDROID = "ANDROID",
}

export enum ServerIntegration {
    LINK_FACTORY = "LINK_FACTORY",
    PATRON = "PATRON",
}

export class SyncAppDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsEnum(Platform)
    platform: Platform;

    @IsString()
    @IsOptional()
    keitaroSourceId?: string;

    @IsString()
    @IsOptional()
    keitaroCloCampId?: string;

    @IsString()
    @IsOptional()
    oldKeitaroSourceId?: string;

    @IsEnum(ServerIntegration)
    @IsOptional()
    serverIntegration?: ServerIntegration;

    @IsOptional()
    namingStreams?: Array<{
        naming: string;
        targetCampaignId: number;
    }>;
}
