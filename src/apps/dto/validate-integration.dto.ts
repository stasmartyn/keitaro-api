import { IsNumber } from "class-validator";
import { Transform } from "class-transformer";

export class ValidateIntegrationDto {
    @Transform(({ obj }) => obj.campaignId ?? obj.campaign_id)
    @IsNumber()
    campaignId: number;
}
