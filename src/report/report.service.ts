import { BadRequestException, Injectable } from "@nestjs/common";
import { KeitaroService } from "../keitaro/keitaro.service";

@Injectable()
export class ReportService {
    constructor(private readonly keitaroService: KeitaroService) {}

    async buildReport(body: Record<string, any>) {
        return this.keitaroService.buildReport(body);
    }

    async conversionLog(body: Record<string, any>) {
        return this.keitaroService.conversionLog(body);
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
