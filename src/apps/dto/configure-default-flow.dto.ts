import { IsNumber, IsOptional, IsBoolean, IsString } from "class-validator";

export class ConfigureDefaultFlowDto {
    @IsNumber()
    appCampaignId: number;

    @IsNumber()
    @IsOptional()
    orgCampaignId?: number;

    @IsBoolean()
    @IsOptional()
    redirectToOrg?: boolean;

    @IsString()
    @IsOptional()
    bundleId?: string;

    @IsString()
    @IsOptional()
    appName?: string;
}
