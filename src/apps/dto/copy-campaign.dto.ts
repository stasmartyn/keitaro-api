import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CopyCampaignDto {
    @IsNumber()
    id: number;

    @IsNumber()
    group_id: number;

    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    sub_id?: string;

    @IsOptional()
    @IsBoolean()
    change_parameters?: boolean;
}
