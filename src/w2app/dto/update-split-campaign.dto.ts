import { IsArray, IsObject, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import { SplitCampaignAppDto } from "./split-campaign-app.dto";

export class UpdateSplitCampaignDto {
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SplitCampaignAppDto)
    apps?: SplitCampaignAppDto[];

    @IsOptional()
    @IsObject()
    parameters?: Record<
        string,
        { name: string; placeholder: string; alias: string }
    >;
}
