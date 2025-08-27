import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { IAndroidApp } from "./interfaces/android-app.interface";

@Schema({ timestamps: true, collection: "androidApps" })
export class AndroidApp implements IAndroidApp {
    @Prop({ type: String, default: null })
    name: string | null;

    @Prop({ type: String, default: null })
    keitaroID: string | null;

    @Prop({ type: String, default: null })
    bundleID: string | null;
}

export type AndroidAppDocument = AndroidApp & Document;

export const AndroidAppSchema = SchemaFactory.createForClass(AndroidApp);
