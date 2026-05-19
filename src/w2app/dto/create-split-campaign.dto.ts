import {
    ArrayMinSize,
    IsArray,
    IsIn,
    IsObject,
    IsString,
    ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

import { DefaultStreamDto } from "./default-stream.dto";
import { SplitCampaignAppDto } from "./split-campaign-app.dto";

export class CreateSplitCampaignDto {
    @IsString()
    campaignName: string;

    @IsIn(["weight"])
    campaignType: "weight";

    @IsIn(["ip_ua"])
    uniquenessMethod: "ip_ua";

    @IsIn([24])
    cookiesTtlHours: number;

    @IsIn(["slo"])
    bindVisitors: "slo";

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => SplitCampaignAppDto)
    apps: SplitCampaignAppDto[];

    @IsObject()
    parameters: Record<
        string,
        { name: string; placeholder: string; alias: string }
    >;

    @ValidateNested()
    @Type(() => DefaultStreamDto)
    defaultStream: DefaultStreamDto;
}
