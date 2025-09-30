import { IsNumber, IsString } from "class-validator";

export class ShareNamingDto {
    @IsNumber()
    campaignId: number;

    @IsString()
    naming: string;

    @IsNumber()
    targetCampaignId: number;
}
