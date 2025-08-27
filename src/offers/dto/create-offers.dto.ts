import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
} from "class-validator";
import { Type } from "class-transformer";

export class LandDto {
    @IsString()
    @IsNotEmpty()
    offer: string;
}

export class CreateMultipleOffersDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    @IsNotEmpty()
    affiliate_network_id: number;

    @IsNumber()
    @IsNotEmpty()
    payout_value: number;

    @IsString()
    @IsNotEmpty()
    payout_currency: string;

    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    country: string[];

    @IsString()
    @IsNotEmpty()
    notes: string;

    @IsOptional()
    @IsString()
    payout_auto: string | null;

    @Type(() => LandDto)
    lands: LandDto;
}

export class CreateSingleOfferDto {
    @IsString()
    @IsNotEmpty()
    app_name: string;

    @IsString()
    @IsNotEmpty()
    bundle_id: string;

    @IsString()
    @IsNotEmpty()
    attribution_type: string;

    @IsString()
    @IsNotEmpty()
    attribution_link: string;
}

export class CreateSingleOfferAppLinkDto {
    @IsString()
    @IsNotEmpty()
    group_id: string;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    link: string;

    @IsString()
    @IsNotEmpty()
    service_template_id: string;
}

export class CreateNewPartnerDto {
    @IsString()
    @IsNotEmpty()
    partnerName: string;

    @IsString()
    @IsNotEmpty()
    mail: string;

    @IsString()
    @IsNotEmpty()
    urlParams: string;

    @IsString()
    @IsNotEmpty()
    testLink: string;

    @IsString()
    @IsNotEmpty()
    testLinkGeo: string;
}
