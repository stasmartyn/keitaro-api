import { IsNumber, IsOptional, IsString } from "class-validator";

export class ValidateIntegrationDto {
    @IsNumber()
    campaignId: number;

    @IsOptional()
    @IsString()
    appId?: string; // App ID для отримання очікуваних namings
}
