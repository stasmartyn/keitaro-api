import { IsString } from "class-validator";

export class CampaignParameterDto {
    @IsString()
    name: string;

    @IsString()
    placeholder: string;

    @IsString()
    alias: string;
}
