import { IsOptional, IsString } from "class-validator";

export class UpdateCampaignDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    keitaroSourceId?: string;

    @IsOptional()
    @IsString()
    keitaroCloCampId?: string;

    @IsOptional()
    @IsString()
    keitaroCloToken?: string;

    @IsOptional()
    @IsString()
    keitaroOrgCampId?: string;

    @IsOptional()
    @IsString()
    keitaroOrgToken?: string;
}
