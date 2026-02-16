import {
    IsNumber,
    IsOptional,
    IsArray,
    ValidateNested,
    ArrayMaxSize,
    ArrayMinSize,
    IsString,
} from "class-validator";
import { Type } from "class-transformer";

export class NamingItemDto {
    @IsString()
    naming: string;

    @IsNumber()
    targetCampaignId: number;

    @IsOptional()
    @IsNumber()
    keitaroCampaign?: number;

    @IsOptional()
    @IsNumber()
    oldKeitaroCampaign?: number;
}

export class ShareNamingDto {
    @IsNumber()
    campaignId: number;

    @IsOptional()
    @IsNumber()
    appId?: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => NamingItemDto)
    @ArrayMinSize(1, { message: "At least 1 naming item is required" })
    @ArrayMaxSize(10, { message: "Maximum 10 naming items allowed per batch" })
    items: NamingItemDto[];
}
