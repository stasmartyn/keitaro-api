import { IsNumber, IsString } from "class-validator";

export class CloseGeoDto {
    @IsNumber()
    campaignId: number;

    @IsString()
    geoCode: string;
}
