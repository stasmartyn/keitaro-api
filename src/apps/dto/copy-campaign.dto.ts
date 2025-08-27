import { IsBoolean, IsNumber, IsString } from "class-validator";

export class CopyCampaignDto {
    @IsNumber()
    id: number;

    @IsNumber()
    group_id: number;

    @IsString()
    name: string;

    @IsString()
    sub_id: string;

    @IsBoolean()
    change_parameters: boolean;
}
