import { IsBoolean, IsNumber } from "class-validator";

export class AllowTrafficDto {
    @IsNumber()
    campaignId: number;

    @IsBoolean()
    allow: boolean;
}
