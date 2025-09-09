import { IsNumber, IsString } from "class-validator";

export class CreateRentCampaignDto {
    @IsNumber()
    groupId: number;

    @IsNumber()
    offerId: number;

    @IsString()
    name: string;
}
