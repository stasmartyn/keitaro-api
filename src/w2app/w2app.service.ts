import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { KeitaroService } from "../keitaro/keitaro.service";
import { Logger } from "../utils/logger";
import {
    buildCampaignParameters,
    buildNamingCampaignPayload,
    buildNamingParameters,
    buildSplitCampaignPayload,
} from "./constants/w2app-campaign.builder";
import {
    buildDefaultSplitStream,
    buildRegularSplitStream,
} from "./constants/w2app-split-stream.builder";
import { parseStreamAppComment } from "./constants/w2app-stream-comments";
import { BanAppDto } from "./dto/ban-app.dto";
import { CreateNamingCampaignDto } from "./dto/create-naming-campaign.dto";
import { CreateSplitCampaignDto } from "./dto/create-split-campaign.dto";
import { SplitCampaignAppDto } from "./dto/split-campaign-app.dto";
import { UpdateNamingCampaignDto } from "./dto/update-naming-campaign.dto";
import { UpdateSplitCampaignDto } from "./dto/update-split-campaign.dto";

type KeitaroStreamOffer = {
    offer_id?: number;
};

type KeitaroStream = {
    id: number;
    name?: string;
    type?: string;
    state?: string;
    weight?: number;
    position?: number;
    comments?: string;
    offers?: KeitaroStreamOffer[];
};

type SplitStateApp = {
    appId: string;
    offerId: number;
    weight: number;
    isActive: boolean;
};

@Injectable()
export class W2appService {
    constructor(
        private readonly keitaroService: KeitaroService,
        private readonly configService: ConfigService,
    ) {}

    async createSplitCampaign(dto: CreateSplitCampaignDto): Promise<{
        campaignId: number;
        campaignToken: string;
        campaignAlias: string;
        streamIds: Array<{
            appId: string;
            splitStreamId: number;
            offerId: number;
        }>;
        defaultStreamId: number;
    }> {
        this.validateSplitApps(dto.apps);

        const campaignGroupId = this.getW2appCampaignGroupId();
        const campaignPayload = buildSplitCampaignPayload(dto, campaignGroupId);
        const plannedStreams = [
            ...dto.apps.map((app, index) => ({
                kind: "regular" as const,
                appId: app.appId,
                payload: buildRegularSplitStream(app, index + 1),
            })),
            {
                kind: "default" as const,
                payload: buildDefaultSplitStream(
                    dto.defaultStream,
                    dto.apps.length + 1,
                ),
            },
        ];

        Logger.info(
            "POST /v1/w2app/split-campaign — вхідний запит",
            {
                incomingBody: dto,
                campaignGroupId,
                campaignPayload,
                plannedStreams: plannedStreams.map((stream) => ({
                    kind: stream.kind,
                    appId: stream.kind === "regular" ? stream.appId : undefined,
                    payload: stream.payload,
                })),
            },
            "W2appService",
        );

        let campaignIdForRollback: number | null = null;

        try {
            const createdCampaign =
                await this.keitaroService.createCampaignRaw(campaignPayload);
            campaignIdForRollback = Number(createdCampaign.id);
            if (!campaignIdForRollback) {
                throw new InternalServerErrorException(
                    "Keitaro returned invalid campaign id",
                );
            }

            const streamIds: Array<{
                appId: string;
                splitStreamId: number;
                offerId: number;
            }> = [];

            for (const [index, app] of dto.apps.entries()) {
                const streamPayload = buildRegularSplitStream(app, index + 1);
                const createdStream = await this.keitaroService.createStream(
                    campaignIdForRollback,
                    streamPayload,
                );
                streamIds.push({
                    appId: app.appId,
                    splitStreamId: Number(createdStream.id),
                    offerId: app.offerId,
                });
            }

            const defaultStreamPayload = buildDefaultSplitStream(
                dto.defaultStream,
                dto.apps.length + 1,
            );
            const defaultStream = await this.keitaroService.createStream(
                campaignIdForRollback,
                defaultStreamPayload,
            );

            return {
                campaignId: campaignIdForRollback,
                campaignToken: String(createdCampaign.token ?? ""),
                campaignAlias: String(createdCampaign.alias ?? ""),
                streamIds,
                defaultStreamId: Number(defaultStream.id),
            };
        } catch (error) {
            Logger.error(
                "POST /v1/w2app/split-campaign — помилка provision",
                {
                    campaignIdForRollback,
                    errorMessage:
                        error instanceof Error ? error.message : String(error),
                },
                "W2appService",
            );
            await this.rollbackCampaignIfNeeded(campaignIdForRollback, error);
            throw error;
        }
    }

    async updateSplitCampaign(
        campaignId: number,
        dto: UpdateSplitCampaignDto,
    ): Promise<void> {
        if (dto.apps && dto.apps.length > 0) {
            this.validateSplitApps(dto.apps);
        }

        const streams = (await this.keitaroService.getCampaignStreams(
            campaignId,
        )) as KeitaroStream[];
        const regularStreams = streams.filter(
            (stream) => stream.type === "regular",
        );

        if (dto.parameters) {
            await this.keitaroService.updateCampaign(campaignId, {
                parameters: buildCampaignParameters(dto.parameters),
            });
        }

        if (!dto.apps || dto.apps.length === 0) {
            return;
        }

        const streamByAppId = new Map<string, KeitaroStream>();
        for (const stream of regularStreams) {
            const appId = parseStreamAppComment(stream.comments);
            if (appId) {
                streamByAppId.set(appId, stream);
            }
        }

        const touchedAppIds = new Set<string>();
        let maxPosition = Math.max(
            0,
            ...regularStreams.map((stream) => Number(stream.position ?? 0)),
        );

        for (const [index, app] of dto.apps.entries()) {
            const existingStream = streamByAppId.get(app.appId);
            touchedAppIds.add(app.appId);

            if (existingStream) {
                await this.keitaroService.updateStream(existingStream.id, {
                    ...buildRegularSplitStream(
                        app,
                        Number(existingStream.position ?? index + 1),
                    ),
                });
                continue;
            }

            maxPosition += 1;
            await this.keitaroService.createStream(
                campaignId,
                buildRegularSplitStream(app, maxPosition),
            );
        }

        for (const stream of regularStreams) {
            const appId = parseStreamAppComment(stream.comments);
            if (!appId || touchedAppIds.has(appId)) {
                continue;
            }

            await this.keitaroService.updateStream(stream.id, {
                state: "disabled",
                weight: 0,
            });
        }
    }

    async getSplitCampaignState(campaignId: number): Promise<{
        campaignId: number;
        apps: SplitStateApp[];
    }> {
        const streams = (await this.keitaroService.getCampaignStreams(
            campaignId,
        )) as KeitaroStream[];

        const apps: SplitStateApp[] = streams
            .filter((stream) => stream.type === "regular")
            .map((stream) => {
                const appId = parseStreamAppComment(stream.comments);
                if (!appId) {
                    return null;
                }

                const offerId = Number(stream.offers?.[0]?.offer_id ?? 0);
                const weight = Number(stream.weight ?? 0);

                return {
                    appId,
                    offerId,
                    weight,
                    isActive: stream.state === "active" && weight > 0,
                };
            })
            .filter((item): item is SplitStateApp => item !== null);

        return { campaignId, apps };
    }

    async disableSplitCampaign(campaignId: number): Promise<void> {
        await this.keitaroService.updateCampaign(campaignId, {
            state: "disabled",
        });
    }

    async banAppInSplit(campaignId: number, dto: BanAppDto): Promise<void> {
        const streams = await this.getRegularStreamsByAppId(campaignId);
        const target = streams.get(dto.appId);
        if (!target) {
            throw new NotFoundException(
                `Split stream for app ${dto.appId} not found`,
            );
        }

        const activeOthers = [...streams.values()].filter(
            (stream) =>
                stream.id !== target.id && Number(stream.weight ?? 0) > 0,
        );
        const rebalanced = rebalanceWeights(activeOthers);

        await this.keitaroService.updateStream(target.id, {
            weight: 0,
            state: "disabled",
        });

        for (const stream of rebalanced) {
            await this.keitaroService.updateStream(stream.id, {
                weight: stream.weight,
                state: stream.weight > 0 ? "active" : "disabled",
            });
        }
    }

    async unbanAppInSplit(campaignId: number, dto: BanAppDto): Promise<void> {
        const streams = await this.getRegularStreamsByAppId(campaignId);
        const target = streams.get(dto.appId);
        if (!target) {
            throw new NotFoundException(
                `Split stream for app ${dto.appId} not found`,
            );
        }

        if (Number(target.weight ?? 0) <= 0) {
            target.weight = 1;
        }

        const activeStreams = [...streams.values()].filter(
            (stream) =>
                stream.id === target.id ||
                (stream.state === "active" && Number(stream.weight ?? 0) > 0),
        );
        const rebalanced = rebalanceWeights(activeStreams);
        for (const stream of rebalanced) {
            await this.keitaroService.updateStream(stream.id, {
                weight: stream.weight,
                state: stream.weight > 0 ? "active" : "disabled",
            });
        }
    }

    async createNamingCampaign(dto: CreateNamingCampaignDto): Promise<{
        campaignId: number;
        campaignToken: string;
    }> {
        const payload = buildNamingCampaignPayload(
            dto,
            this.getW2appNamingGroupId(),
        );
        const createdCampaign =
            await this.keitaroService.createCampaignRaw(payload);
        const campaignId = Number(createdCampaign.id);
        if (!campaignId || Number.isNaN(campaignId)) {
            throw new InternalServerErrorException(
                "Keitaro returned invalid campaign id",
            );
        }

        return {
            campaignId,
            campaignToken: String(createdCampaign.token ?? ""),
        };
    }

    async updateNamingCampaign(
        campaignId: number,
        dto: UpdateNamingCampaignDto,
    ): Promise<void> {
        await this.keitaroService.updateCampaign(campaignId, {
            parameters: buildNamingParameters(dto.aliases),
        });
    }

    async disableNamingCampaign(campaignId: number): Promise<void> {
        await this.keitaroService.updateCampaign(campaignId, {
            state: "disabled",
        });
    }

    private validateSplitApps(apps: SplitCampaignAppDto[]): void {
        if (apps.length === 0) {
            throw new BadRequestException("Apps array must not be empty");
        }

        const appIds = new Set(apps.map((app) => app.appId));
        if (appIds.size !== apps.length) {
            throw new BadRequestException(
                "Duplicate appId in split campaign apps",
            );
        }

        const totalWeight = apps.reduce((acc, app) => acc + app.weight, 0);
        if (totalWeight !== 100) {
            throw new BadRequestException(
                `Regular streams weight must equal 100. Current sum: ${totalWeight}`,
            );
        }
    }

    private async rollbackCampaignIfNeeded(
        campaignId: number | null,
        originalError: unknown,
    ): Promise<void> {
        if (!campaignId) {
            return;
        }

        try {
            await this.keitaroService.deleteCampaign(String(campaignId));
        } catch (rollbackError) {
            Logger.error(
                "Failed to rollback split campaign after create error",
                {
                    campaignId,
                    originalError:
                        originalError instanceof Error
                            ? originalError.message
                            : String(originalError),
                    rollbackError:
                        rollbackError instanceof Error
                            ? rollbackError.message
                            : String(rollbackError),
                },
                "W2appService",
            );
        }
    }

    private async getRegularStreamsByAppId(
        campaignId: number,
    ): Promise<Map<string, KeitaroStream>> {
        const streams = (await this.keitaroService.getCampaignStreams(
            campaignId,
        )) as KeitaroStream[];

        const regularStreamsByAppId = new Map<string, KeitaroStream>();
        for (const stream of streams) {
            if (stream.type !== "regular") {
                continue;
            }

            const appId = parseStreamAppComment(stream.comments);
            if (appId) {
                regularStreamsByAppId.set(appId, stream);
            }
        }

        return regularStreamsByAppId;
    }

    private getW2appCampaignGroupId(): number {
        const groupId = Number(this.configService.get("w2app.campaignGroupId"));
        if (!groupId || groupId <= 0) {
            throw new InternalServerErrorException(
                "Missing required env: W2APP_CAMPAIGN_GROUP_ID",
            );
        }

        return groupId;
    }

    private getW2appNamingGroupId(): number {
        const groupId = Number(this.configService.get("w2app.namingGroupId"));
        if (!groupId || groupId <= 0) {
            throw new InternalServerErrorException(
                "Missing required env: W2APP_NAMING_GROUP_ID",
            );
        }

        return groupId;
    }
}

function rebalanceWeights<T extends { id: number; weight?: number }>(
    streams: T[],
): Array<T & { weight: number }> {
    if (streams.length === 0) {
        return [];
    }

    const total = streams.reduce(
        (sum, stream) => sum + Math.max(0, Number(stream.weight ?? 0)),
        0,
    );

    if (total <= 0) {
        const base = Math.floor(100 / streams.length);
        let remainder = 100 - base * streams.length;
        return streams.map((stream) => {
            const nextWeight = base + (remainder > 0 ? 1 : 0);
            remainder = Math.max(0, remainder - 1);
            return { ...stream, weight: nextWeight };
        });
    }

    const weighted = streams.map((stream) => {
        const raw = (Math.max(0, Number(stream.weight ?? 0)) / total) * 100;
        const floorWeight = Math.floor(raw);

        return {
            stream,
            floorWeight,
            fraction: raw - floorWeight,
        };
    });

    let remainder =
        100 - weighted.reduce((sum, item) => sum + item.floorWeight, 0);

    weighted.sort((left, right) => right.fraction - left.fraction);
    for (const item of weighted) {
        if (remainder <= 0) {
            break;
        }
        item.floorWeight += 1;
        remainder -= 1;
    }

    return weighted.map((item) => ({
        ...item.stream,
        weight: item.floorWeight,
    }));
}
