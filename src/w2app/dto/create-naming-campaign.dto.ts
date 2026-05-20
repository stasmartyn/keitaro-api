import { IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";

export class CreateNamingCampaignDto {
    @IsString()
    flowName: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    groupId?: number;

    @IsObject()
    aliases: Record<string, string>;
}
