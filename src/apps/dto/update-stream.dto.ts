import {
    IsOptional,
    IsString,
    IsNumber,
    IsBoolean,
    IsArray,
    IsObject,
} from "class-validator";

export class UpdateStreamDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    action_type?: string;

    @IsOptional()
    action_payload?: string | number | object;

    @IsOptional()
    @IsString()
    schema?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsNumber()
    position?: number;

    @IsOptional()
    @IsNumber()
    weight?: number;

    @IsOptional()
    @IsBoolean()
    collect_clicks?: boolean;

    @IsOptional()
    @IsBoolean()
    filter_or?: boolean;

    @IsOptional()
    @IsArray()
    filters?: any[];

    @IsOptional()
    @IsArray()
    offers?: any[];

    @IsOptional()
    @IsArray()
    landings?: any[];

    @IsOptional()
    @IsArray()
    triggers?: any[];

    @IsOptional()
    @IsObject()
    action_options?: any;
}
