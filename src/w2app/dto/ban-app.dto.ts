import { IsUUID } from "class-validator";

export class BanAppDto {
    @IsUUID()
    appId: string;
}
