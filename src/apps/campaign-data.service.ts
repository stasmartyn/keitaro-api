import { Injectable } from "@nestjs/common";
import { KeitaroService } from "../keitaro/keitaro.service";

@Injectable()
export class CampaignDataService {
    constructor(private readonly keitaroService: KeitaroService) {}

    async getFullCampaignInfo(campaignId: number) {
        const { campaign, streams, trafficSource, group } =
            await this.keitaroService.getCampaignWithRelatedData(campaignId);

        const result: any = {
            source: {
                sourceId: campaign.traffic_source_id,
                sourceName: trafficSource?.name || null,
                postbackUrl: trafficSource?.postback_url || null,
            },
            cloCampaign: {
                campaignName: campaign.name,
                campaignId: campaign.id,
                group: group?.name || null,
                settings: {
                    userBinding:
                        campaign.parameters?.user_binding ||
                        campaign.parameters?.flow_rotation ||
                        null,
                    userUniqueness:
                        campaign.parameters?.user_uniqueness ||
                        campaign.parameters?.uniqueness ||
                        null,
                    cookieLifetime:
                        campaign.parameters?.cookie_lifetime ||
                        campaign.parameters?.cookie_ttl ||
                        null,
                    weightBased: campaign.parameters?.weight_based || null,
                    bindToFlows: campaign.parameters?.bind_to_flows || null,
                    bindToLandings:
                        campaign.parameters?.bind_to_landings || null,
                    bindToOffers: campaign.parameters?.bind_to_offers || null,
                },
            },
            streams: {
                trafficSwitch: null,
                botFlow: null,
                geoBlockFlow: null,
                buyerNamingFlows: [],
                finalFlow: null,
            },
            campaign,
            allStreams: streams,
        };

        this.analyzeStreams(streams, result.streams);

        return result;
    }

    private analyzeStreams(streams: any[], streamInfo: any) {
        streams.forEach((stream) => {
            const streamName = stream.name?.toLowerCase() || "";
            const streamType = stream.type;

            if (
                streamName.includes("deny all traffic") ||
                streamName.includes("traffic switch")
            ) {
                streamInfo.trafficSwitch = this.createStreamObject(
                    stream,
                    streamType,
                );
            } else if (
                streamName.includes("bot") ||
                streamName.includes("bot flow")
            ) {
                streamInfo.botFlow = this.createStreamObject(
                    stream,
                    streamType,
                );
            } else if (
                streamName.includes("geo") ||
                streamName.includes("country") ||
                streamName.includes("block")
            ) {
                streamInfo.geoBlockFlow = {
                    ...this.createStreamObject(stream, streamType),
                    blockedCountries: this.extractBlockedCountries(stream),
                };
            } else if (
                streamName.includes("buyer") ||
                streamName.includes("naming") ||
                streamType === "regular"
            ) {
                streamInfo.buyerNamingFlows.push({
                    ...this.createStreamObject(stream, streamType),
                    targetCampaign: stream.action_payload,
                });
            } else if (
                streamType === "default" ||
                streamName.includes("final") ||
                streamName.includes("finally")
            ) {
                streamInfo.finalFlow = {
                    ...this.createStreamObject(stream, streamType),
                    targetCampaign: stream.action_payload,
                };
            }
        });
    }

    private createStreamObject(stream: any, streamType: string) {
        return {
            id: stream.id,
            name: stream.name,
            state: stream.state,
            type: streamType,
            action: stream.action_type,
        };
    }

    private extractBlockedCountries(stream: any): string[] {
        if (stream.filters && Array.isArray(stream.filters)) {
            return stream.filters
                .filter(
                    (filter: any) =>
                        filter.type === "geo" || filter.type === "country",
                )
                .map((filter: any) => filter.value)
                .flat();
        }
        return [];
    }
}
