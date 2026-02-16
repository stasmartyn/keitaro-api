import { IsNotEmpty, IsString } from "class-validator";

export class CreateEmptyCampaignDto {
    @IsString()
    @IsNotEmpty()
    sub: string;

    @IsString()
    @IsNotEmpty()
    buyer: string;
}
