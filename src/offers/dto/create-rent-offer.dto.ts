import { IsNotEmpty, IsString } from "class-validator";

export class CreateRentOfferDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    domain: string;
}
