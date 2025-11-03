import { IsBoolean, IsNotEmpty, IsNumber } from "class-validator";

export class EnableCloakDto {
    @IsNumber()
    @IsNotEmpty()
    offerId: number;

    @IsBoolean()
    @IsNotEmpty()
    enableCloaking: boolean;
}
