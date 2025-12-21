import { IsNumber } from "class-validator";

export class ValidateIntegrationDto {
    @IsNumber()
    campaignId: number;
}
