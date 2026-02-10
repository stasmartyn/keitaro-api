import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class CreateEmptyCampaignDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsIn(["ios", "android"])
    os_platform: "ios" | "android";

    @IsString()
    @IsNotEmpty()
    sub: string;
}
