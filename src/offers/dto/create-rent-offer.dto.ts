import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRentOfferDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    domain: string;

    @IsString()
    @IsOptional()
    linkTemplate?: string;
}
