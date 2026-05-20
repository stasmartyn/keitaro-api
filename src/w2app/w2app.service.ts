import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { KeitaroService } from "../keitaro/keitaro.service";
import { mapKeitaroErrorToHttpException } from "../utils/map-keitaro-http-error.util";
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
import { rebalanceWeights } from "./utils/w2app-rebalance.util";

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

type StreamRollbackSnapshot = {
    id: number;
    weight: number;
    state: string;
};

type StreamUpdateStep = {
    snapshot: StreamRollbackSnapshot;
    payload: Record<string, unknown>;
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
            await this.rollbackCampaignIfNeeded(campaignIdForRollback);
            throw mapKeitaroErrorToHttpException(error);
        }
    }

    async updateSplitCampaign(
        campaignId: number,
        dto: UpdateSplitCampaignDto,
    ): Promise<void> {
        return this.withKeitaro(async () => {
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

            const appliedSnapshots: StreamRollbackSnapshot[] = [];

            try {
                for (const [index, app] of dto.apps.entries()) {
                    const existingStream = streamByAppId.get(app.appId);
                    touchedAppIds.add(app.appId);

                    if (existingStream) {
                        const snapshot =
                            this.snapshotStreamState(existingStream);
                        await this.keitaroService.updateStream(
                            existingStream.id,
                            {
                                ...buildRegularSplitStream(
                                    app,
                                    Number(
                                        existingStream.position ?? index + 1,
                                    ),
                                ),
                            },
                        );
                        appliedSnapshots.push(snapshot);
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

                    const snapshot = this.snapshotStreamState(stream);
                    await this.keitaroService.updateStream(stream.id, {
                        state: "disabled",
                        weight: 0,
                    });
                    appliedSnapshots.push(snapshot);
                }
            } catch (error) {
                await this.rollbackStreamSnapshots(appliedSnapshots);
                throw error;
            }
        });
    }

    async getSplitCampaignState(campaignId: number): Promise<{
        campaignId: number;
        apps: SplitStateApp[];
    }> {
        return this.withKeitaro(async () => {
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
        });
    }

    async disableSplitCampaign(campaignId: number): Promise<void> {
        return this.withKeitaro(async () => {
            await this.keitaroService.updateCampaign(campaignId, {
                state: "disabled",
            });
        });
    }

    async banAppInSplit(campaignId: number, dto: BanAppDto): Promise<void> {
        return this.withKeitaro(async () => {
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
            const originalById = new Map(
                activeOthers.map((stream) => [stream.id, stream]),
            );
            const steps: StreamUpdateStep[] = rebalanced.map((stream) => {
                const original = originalById.get(stream.id) ?? stream;

                return {
                    snapshot: this.snapshotStreamState(original),
                    payload: {
                        weight: stream.weight,
                        state: stream.weight > 0 ? "active" : "disabled",
                    },
                };
            });

            steps.push({
                snapshot: this.snapshotStreamState(target),
                payload: { weight: 0, state: "disabled" },
            });

            await this.applyStreamUpdatesWithRollback(steps);
        });
    }

    async unbanAppInSplit(campaignId: number, dto: BanAppDto): Promise<void> {
        return this.withKeitaro(async () => {
            const streams = await this.getRegularStreamsByAppId(campaignId);
            const target = streams.get(dto.appId);
            if (!target) {
                throw new NotFoundException(
                    `Split stream for app ${dto.appId} not found`,
                );
            }

            const targetSnapshot = this.snapshotStreamState(target);

            if (Number(target.weight ?? 0) <= 0) {
                target.weight = 1;
            }

            const activeStreams = [...streams.values()].filter(
                (stream) =>
                    stream.id === target.id ||
                    (stream.state === "active" &&
                        Number(stream.weight ?? 0) > 0),
            );
            const rebalanced = rebalanceWeights(activeStreams);
            const originalById = new Map(
                [...streams.values()].map((stream) => [stream.id, stream]),
            );
            const steps: StreamUpdateStep[] = [];

            for (const stream of rebalanced) {
                if (stream.id === target.id) {
                    continue;
                }

                const original = originalById.get(stream.id) ?? stream;
                steps.push({
                    snapshot: this.snapshotStreamState(original),
                    payload: {
                        weight: stream.weight,
                        state: stream.weight > 0 ? "active" : "disabled",
                    },
                });
            }

            const targetRebalanced = rebalanced.find(
                (stream) => stream.id === target.id,
            );
            if (targetRebalanced) {
                steps.push({
                    snapshot: targetSnapshot,
                    payload: {
                        weight: targetRebalanced.weight,
                        state:
                            targetRebalanced.weight > 0 ? "active" : "disabled",
                    },
                });
            }

            await this.applyStreamUpdatesWithRollback(steps);
        });
    }

    async createNamingCampaign(dto: CreateNamingCampaignDto): Promise<{
        campaignId: number;
        campaignToken: string;
    }> {
        return this.withKeitaro(async () => {
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
        });
    }

    async updateNamingCampaign(
        campaignId: number,
        dto: UpdateNamingCampaignDto,
    ): Promise<void> {
        return this.withKeitaro(async () => {
            await this.keitaroService.updateCampaign(campaignId, {
                parameters: buildNamingParameters(dto.aliases),
            });
        });
    }

    async disableNamingCampaign(campaignId: number): Promise<void> {
        return this.withKeitaro(async () => {
            await this.keitaroService.updateCampaign(campaignId, {
                state: "disabled",
            });
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

    private snapshotStreamState(stream: KeitaroStream): StreamRollbackSnapshot {
        const weight = Number(stream.weight ?? 0);

        return {
            id: stream.id,
            weight,
            state:
                typeof stream.state === "string" && stream.state.length > 0
                    ? stream.state
                    : weight > 0
                      ? "active"
                      : "disabled",
        };
    }

    private async applyStreamUpdatesWithRollback(
        steps: StreamUpdateStep[],
    ): Promise<void> {
        const appliedSnapshots: StreamRollbackSnapshot[] = [];

        try {
            for (const step of steps) {
                await this.keitaroService.updateStream(
                    step.snapshot.id,
                    step.payload,
                );
                appliedSnapshots.push(step.snapshot);
            }
        } catch (error) {
            await this.rollbackStreamSnapshots(appliedSnapshots);
            throw error;
        }
    }

    private async rollbackStreamSnapshots(
        snapshots: StreamRollbackSnapshot[],
    ): Promise<void> {
        for (const snapshot of [...snapshots].reverse()) {
            try {
                await this.keitaroService.updateStream(snapshot.id, {
                    weight: snapshot.weight,
                    state: snapshot.state,
                });
            } catch {
                // Rollback best-effort; primary error is rethrown to the client.
            }
        }
    }

    private async rollbackCampaignIfNeeded(
        campaignId: number | null,
    ): Promise<void> {
        if (!campaignId) {
            return;
        }

        try {
            await this.keitaroService.deleteCampaign(String(campaignId));
        } catch {
            // Rollback best-effort; primary error is rethrown to the client.
        }
    }

    private async withKeitaro<T>(operation: () => Promise<T>): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            throw mapKeitaroErrorToHttpException(error);
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
