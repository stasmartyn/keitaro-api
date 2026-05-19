import { IsObject } from "class-validator";

export class UpdateNamingCampaignDto {
    @IsObject()
    aliases: Record<string, string>;
}
