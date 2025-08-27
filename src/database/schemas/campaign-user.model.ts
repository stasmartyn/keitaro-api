import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ICampaignUser } from "./interfaces/campaign-user.interface";

@Schema({ timestamps: true, collection: "campaignUser" })
export class CampaignUser implements ICampaignUser {
    @Prop({ type: String, default: null })
    nickName: string | null;

    @Prop({ type: String, default: null })
    group_id: string | null;

    @Prop({ type: String, default: null })
    sub: string | null;
}

export type CampaignUserDocument = CampaignUser & Document;

export const CampaignUserSchema = SchemaFactory.createForClass(CampaignUser);
