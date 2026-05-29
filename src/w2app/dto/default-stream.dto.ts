import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class DefaultStreamDto {
    @IsInt()
    @Min(1)
    fallbackCampaignId: number;

    @IsOptional()
    @IsString()
    name?: string;
}
