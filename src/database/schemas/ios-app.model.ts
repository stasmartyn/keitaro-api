import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IIosApp } from "./interfaces/ios-app.interface";

@Schema({ timestamps: true, collection: "apps" })
export class IosApp implements IIosApp {
    @Prop({ type: String, default: null })
    name: string | null;

    @Prop({ type: String, default: null })
    keitaroID: string | null;

    @Prop({ type: String, default: null })
    bundleID: string | null;

    @Prop({ type: String, default: null })
    appID: string | null;
}

export type IosAppDocument = IosApp & Document;

export const IosAppSchema = SchemaFactory.createForClass(IosApp);
