import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class AllowTrafficDto {
    @IsNumber()
    campaignId: number;

    @IsOptional()
    @IsBoolean()
    allow?: boolean;
}
