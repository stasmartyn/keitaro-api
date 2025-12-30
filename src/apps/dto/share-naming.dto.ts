import { IsNumber, IsOptional, IsString } from "class-validator";

export class ShareNamingDto {
    @IsNumber()
    campaignId: number;

    @IsString()
    naming: string;

    @IsNumber()
    @IsOptional()
    keitaroCampaign?: number;

    @IsNumber()
    orgCampaignId: number;
}
