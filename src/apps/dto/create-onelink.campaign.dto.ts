import { Type } from "class-transformer";
import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

export class CreateOnelinkCampaignDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    offer_id: number;

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
