import { IsNotEmpty, IsString } from "class-validator";

export class CreateOnelinkCampaignDto {
    @IsString()
    @IsNotEmpty()
    offer_id: string;

    @IsNotEmpty()
    @IsString()
    bundle_id: string;

    @IsNotEmpty()
    @IsString()
    app_name: string;
}
