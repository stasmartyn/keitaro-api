import { BadRequestException, Injectable } from "@nestjs/common";
import { KeitaroService } from "../keitaro/keitaro.service";
import { BusinessResultsRequestDto } from "./dto/business-results-request.dto";
import {
    BusinessResultsResponse,
    DayStats,
    OrgDayStats,
    DatasetSummary,
    OrgDatasetSummary,
    Dataset,
} from "./interfaces/business-results.interface";

const RENT_OFFER_GROUP_ID = 10;
const TD_CAMPAIGN_IDS = new Set([518, 111]);

@Injectable()
export class ReportService {
    constructor(private readonly keitaroService: KeitaroService) {}

    async buildReport(body: Record<string, any>) {
        return this.keitaroService.buildReport(body);
    }

    async conversionLog(body: Record<string, any>) {
        return this.keitaroService.conversionLog(body);
    }

    async clicksLog(body: Record<string, any>) {
        return this.keitaroService.clicksLog(body);
    }

    async getBusinessResults(
        dto: BusinessResultsRequestDto,
    ): Promise<BusinessResultsResponse> {
        const payload = {
            measures: [
                "campaign_unique_clicks",
                "leads",
                "sales",
                "sale_revenue",
            ],
            filters: {
                AND: [
                    {
                        name: "sub_id_10",
                        operator: "MATCH_REGEXP",
                        expression: "\\bid\\d+\\b",
                    },
                    {
                        name: "campaign_group_id",
                        operator: "NOT_IN_LIST",
                        expression: [1, 2],
                    },
                    {
                        name: "offer_id",
                        operator: "NOT_EQUAL",
                        expression: "",
                    },
                ],
            },
            sort: [{ name: "day", order: "asc" }],
            range: {
                from: dto.dateFrom,
                to: dto.dateTo,
                timezone: "Europe/Warsaw",
                interval: "custom_date_range",
            },
            // Keitaro applies limit to the first dimension (day), not to total rows.
            // Max date range is 31 days → at most 31 day-groups returned; 5000 is unreachable.
            limit: 5000,
            dimensions: ["day", "offer_group_id", "campaign_id"],
            offset: 0,
            summary: false,
            extended: true,
        };

        const result = await this.keitaroService.buildReport(payload);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Keitaro API rows
        const rows: any[] = result?.rows ?? [];

        const orgRows = rows.filter(
            (row) => Number(row.offer_group_id) !== RENT_OFFER_GROUP_ID,
        );
        const rentRows = rows.filter(
            (row) => Number(row.offer_group_id) === RENT_OFFER_GROUP_ID,
        );
        const tdRows = rows.filter((row) =>
            TD_CAMPAIGN_IDS.has(Number(row.campaign_id)),
        );

        return {
            total: this.aggregateDays(rows, false),
            org: this.aggregateDays(orgRows, true),
            rent: this.aggregateDays(rentRows, false),
            td: this.aggregateDays(tdRows, false),
        };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Keitaro API rows
    private aggregateDays(
        rows: any[],
        includeRevenue: true,
    ): Dataset<OrgDayStats, OrgDatasetSummary>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Keitaro API rows
    private aggregateDays(
        rows: any[],
        includeRevenue: false,
    ): Dataset<DayStats, DatasetSummary>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Keitaro API rows
    private aggregateDays(
        rows: any[],
        includeRevenue: boolean,
    ): Dataset<DayStats | OrgDayStats, DatasetSummary | OrgDatasetSummary> {
        const map = new Map<
            string,
            {
                installs: number;
                registrations: number;
                deposits: number;
                revenue: number;
            }
        >();

        for (const row of rows) {
            // justified: row is any from Keitaro API; day is always YYYY-MM-DD string
            const date = String(row.day);
            const existing = map.get(date) ?? {
                installs: 0,
                registrations: 0,
                deposits: 0,
                revenue: 0,
            };

            map.set(date, {
                installs:
                    existing.installs + Number(row.campaign_unique_clicks),
                registrations: existing.registrations + Number(row.leads),
                deposits: existing.deposits + Number(row.sales),
                revenue: existing.revenue + Number(row.sale_revenue),
            });
        }

        const daily = Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, agg]) => {
                const base: DayStats = {
                    date,
                    installs: agg.installs,
                    registrations: agg.registrations,
                    deposits: agg.deposits,
                };
                if (includeRevenue) {
                    return { ...base, revenue: agg.revenue } as OrgDayStats;
                }
                return base;
            });

        const summary = daily.reduce(
            (acc, day) => {
                acc.installs += day.installs;
                acc.registrations += day.registrations;
                acc.deposits += day.deposits;
                if (includeRevenue) {
                    (acc as OrgDatasetSummary).revenue += (
                        day as OrgDayStats
                    ).revenue;
                }
                return acc;
            },
            includeRevenue
                ? ({
                      installs: 0,
                      registrations: 0,
                      deposits: 0,
                      revenue: 0,
                  } as OrgDatasetSummary)
                : ({
                      installs: 0,
                      registrations: 0,
                      deposits: 0,
                  } as DatasetSummary),
        );

        return { daily, summary };
    }

    async stats(body: Record<string, any>) {
        const { startDate, endDate, campaignGroupId } = body;
        if (!startDate || !endDate || !campaignGroupId) {
            throw new BadRequestException(
                "Missing required fields: startDate, endDate, or campaignGroupId.",
            );
        }
        const params = {
            range: {
                interval: "custom_date_range",
                timezone: "Europe/Kyiv",
                from: `${startDate} 00:00`,
                to: `${endDate} 23:59`,
            },
            columns: [],
            metrics: ["conversions", "sales", "sale_revenue"],
            grouping: ["day", "country_flag", "ts_id"],
            filters: [
                {
                    name: "campaign_group_id",
                    operator: "EQUALS",
                    expression: campaignGroupId,
                },
                { name: "ts_id", operator: "NOT_EQUAL", expression: "" },
            ],
            sort: [{ name: "day", order: "asc" }],
            summary: true,
            limit: 1000,
            offset: 0,
        };
        return this.keitaroService.buildReport(params);
    }
}
