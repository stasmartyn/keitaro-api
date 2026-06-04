import { IsInt, IsString, IsUUID, Max, Min } from "class-validator";

export class SplitCampaignAppDto {
    @IsUUID()
    appId: string;

    @IsInt()
    @Min(1)
    offerId: number;

    @IsInt()
    @Min(1)
    @Max(100)
    weight: number;

    @IsString()
    streamName: string;
}
