import { IsString } from "class-validator";

export class CreateNoOrgCampaignDto {
    @IsString()
    name: string;

    @IsString()
    bundle: string;

    @IsString()
    buyerId: string;
}
