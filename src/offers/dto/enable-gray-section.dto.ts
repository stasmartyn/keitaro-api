import { IsBoolean, IsNotEmpty, IsNumber } from "class-validator";

export class EnableGraySectionDto {
    @IsNumber()
    @IsNotEmpty()
    offerId: number;

    @IsBoolean()
    @IsNotEmpty()
    enableGraySection: boolean;
}
