import { IsNumber } from "class-validator";

export class CloseCloakDto {
    @IsNumber()
    campaignId: number;
}
