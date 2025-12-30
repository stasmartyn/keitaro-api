import { IsNumber, IsOptional, IsString } from "class-validator";

export class ShareNamingDto {
    @IsNumber()
    campaignId: number;

    @IsString()
    naming: string;

    @IsOptional()
    @IsNumber()
    keitaroCampaign?: number;

    @IsNumber()
    orgCampaignId: number;
}
