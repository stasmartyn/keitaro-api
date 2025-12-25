import { IsBoolean, IsNumber } from "class-validator";

export class ToggleDenyOrgTrafficDto {
    @IsNumber()
    campaignId: number;

    @IsBoolean()
    enable: boolean;
}
