import { DefaultStreamDto } from "../dto/default-stream.dto";
import { SplitCampaignAppDto } from "../dto/split-campaign-app.dto";
import { encodeStreamAppComment } from "./w2app-stream-comments";

export function buildRegularSplitStream(
    app: SplitCampaignAppDto,
    position: number,
): Record<string, unknown> {
    return {
        type: "regular",
        name: app.streamName,
        position,
        weight: app.weight,
        action_options: {},
        comments: encodeStreamAppComment(app.appId),
        state: app.weight > 0 ? "active" : "disabled",
        action_type: "http",
        action_payload: "",
        schema: "landings",
        collect_clicks: true,
        filter_or: false,
        filters: [],
        triggers: [],
        landings: [],
        offers: [
            {
                offer_id: app.offerId,
                share: 100,
                state: "active",
            },
        ],
    };
}

export function buildDefaultSplitStream(
    defaultStream: DefaultStreamDto,
    position: number,
): Record<string, unknown> {
    return {
        type: "default",
        name: defaultStream.name ?? "Default",
        position,
        weight: 0,
        action_options: {},
        comments: "W2App default stream",
        state: "active",
        action_type: "campaign",
        action_payload: String(defaultStream.fallbackCampaignId),
        schema: "action",
        collect_clicks: true,
        filter_or: false,
        filters: [],
        triggers: [],
        landings: [],
        offers: [],
    };
}
