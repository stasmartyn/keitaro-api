import { IsBoolean, IsNumber } from "class-validator";

export class ToggleTestFlowDto {
    @IsNumber()
    campaignId: number;

    @IsBoolean()
    enable: boolean;
}
