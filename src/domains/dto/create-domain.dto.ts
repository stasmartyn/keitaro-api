import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateDomainDto {
    @IsString()
    @IsNotEmpty()
    domain: string;

    @IsNumber()
    @IsNotEmpty()
    groupId: number;

    @IsString()
    @IsNotEmpty()
    oneLinkSettings: string;
}
