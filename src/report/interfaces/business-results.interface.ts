export interface DayStats {
    date: string;
    installs: number;
    registrations: number;
    deposits: number;
}

export interface OrgDayStats extends DayStats {
    revenue: number;
}

export interface DatasetSummary {
    installs: number;
    registrations: number;
    deposits: number;
}

export interface OrgDatasetSummary extends DatasetSummary {
    revenue: number;
}

export interface Dataset<
    TDay extends DayStats,
    TSummary extends DatasetSummary,
> {
    daily: TDay[];
    summary: TSummary;
}

export interface BusinessResultsResponse {
    total: Dataset<DayStats, DatasetSummary>;
    org: Dataset<OrgDayStats, OrgDatasetSummary>;
    rent: Dataset<DayStats, DatasetSummary>;
    td: Dataset<DayStats, DatasetSummary>;
}
