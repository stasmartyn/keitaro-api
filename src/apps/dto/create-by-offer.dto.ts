import { IsNotEmpty, IsString } from "class-validator";

export class CreateByOfferDto {
    @IsString()
    @IsNotEmpty()
    offer_id: string;
}
