import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateOnelinkCampaignDto {
    @IsNotEmpty()
    offer_id: string | number;

    @IsNotEmpty()
    @IsString()
    bundle_id: string;

    @IsNotEmpty()
    @IsString()
    app_name: string;

    @IsOptional()
    @IsNumber()
    onelink_landing_id?: number;

    @IsOptional()
    @IsNumber()
    campaign_group_id?: number;
}
