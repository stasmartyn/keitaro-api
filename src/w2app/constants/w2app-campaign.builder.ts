import { generateUniqueAlias } from "../../utils/generateUniqueAlias";
import { CreateNamingCampaignDto } from "../dto/create-naming-campaign.dto";
import { CreateSplitCampaignDto } from "../dto/create-split-campaign.dto";

type CampaignParameter = { name: string; placeholder: string; alias: string };
const ALLOWED_SUB_ID_KEY = /^sub_id_([1-9]|[12][0-9]|30)$/;
const FORBIDDEN_OBJECT_KEYS = new Set([
    "__proto__",
    "prototype",
    "constructor",
]);

export function buildSplitCampaignPayload(
    dto: CreateSplitCampaignDto,
    campaignGroupId: number,
): Record<string, unknown> {
    return {
        name: dto.campaignName,
        alias: generateUniqueAlias(),
        type: dto.campaignType,
        uniqueness_method: dto.uniquenessMethod,
        cookies_ttl: dto.cookiesTtlHours,
        bind_visitors: dto.bindVisitors,
        traffic_source_id: 0,
        domain_id: 1,
        state: "active",
        group_id: campaignGroupId,
        parameters: buildCampaignParameters(dto.parameters),
    };
}

export function buildNamingCampaignPayload(
    dto: CreateNamingCampaignDto,
    namingGroupId: number,
): Record<string, unknown> {
    const parameters = buildNamingParameters(dto.aliases);

    return {
        name: `W2A-NAMING ${dto.flowName}`,
        alias: generateUniqueAlias(),
        type: "weight",
        uniqueness_method: "ip_ua",
        cookies_ttl: 24,
        bind_visitors: "slo",
        traffic_source_id: 0,
        domain_id: 1,
        state: "active",
        group_id: dto.groupId ?? namingGroupId,
        parameters,
    };
}

export function buildCampaignParameters(
    sourceParameters: Record<string, CampaignParameter>,
): Record<string, CampaignParameter> {
    const parameters = buildDefaultSubIdParameters();

    for (const [key, value] of Object.entries(sourceParameters)) {
        if (!isAllowedParameterKey(key)) {
            continue;
        }

        parameters[key] = {
            name: value?.name ?? "",
            placeholder: value?.placeholder ?? "",
            alias: value?.alias ?? "",
        };
    }

    return parameters;
}

export function buildNamingParameters(
    aliases: Record<string, string>,
): Record<string, CampaignParameter> {
    const parameters = buildDefaultSubIdParameters();

    for (const [key, alias] of Object.entries(aliases)) {
        if (!isAllowedParameterKey(key)) {
            continue;
        }

        const existing = parameters[key] ?? {
            name: key,
            placeholder: "",
            alias: "",
        };
        parameters[key] = {
            ...existing,
            alias,
        };
    }

    return parameters;
}

function buildDefaultSubIdParameters(): Record<string, CampaignParameter> {
    const parameters: Record<string, CampaignParameter> = Object.create(null);

    for (let index = 1; index <= 30; index += 1) {
        parameters[`sub_id_${index}`] = {
            name: `sub${index}`,
            placeholder: `{sub${index}}`,
            alias: "",
        };
    }

    return parameters;
}

function isAllowedParameterKey(key: string): boolean {
    if (FORBIDDEN_OBJECT_KEYS.has(key)) {
        return false;
    }

    return ALLOWED_SUB_ID_KEY.test(key);
}
