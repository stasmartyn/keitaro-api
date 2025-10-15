import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateAppDto {
    @IsString()
    name: string;

    @IsString()
    bundle_id: string;

    @IsString()
    sub_id: string;

    @IsString()
    postback_url: string;

    @IsBoolean()
    isAndroid: boolean;

    @IsBoolean()
    isIos: boolean;

    @IsOptional()
    @IsNumber()
    campaign_id?: number;
}
