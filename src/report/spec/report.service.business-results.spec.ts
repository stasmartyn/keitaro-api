import { Test, TestingModule } from "@nestjs/testing";
import { ReportService } from "../report.service";
import { KeitaroService } from "../../keitaro/keitaro.service";

const mockKeitaroService = {
    buildReport: jest.fn(),
    conversionLog: jest.fn(),
    clicksLog: jest.fn(),
};

const ROW = (
    day: string,
    offer_group_id: number,
    campaign_id: number,
    clicks = 10,
    leads = 5,
    sales = 2,
    revenue = 100,
) => ({
    day,
    offer_group_id,
    campaign_id,
    campaign_unique_clicks: clicks,
    leads,
    sales,
    sale_revenue: revenue,
});

describe("ReportService — getBusinessResults", () => {
    let service: ReportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportService,
                { provide: KeitaroService, useValue: mockKeitaroService },
            ],
        }).compile();

        service = module.get<ReportService>(ReportService);
        jest.clearAllMocks();
    });

    const callService = (dateFrom = "2026-05-01", dateTo = "2026-05-07") =>
        service.getBusinessResults({ dateFrom, dateTo });

    describe("dataset splitting", () => {
        it("splits rows into total / org / rent / td correctly", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-01", 5, 100), // org + total
                    ROW("2026-05-01", 10, 200), // rent + total
                    ROW("2026-05-01", 5, 518), // td + org + total
                    ROW("2026-05-01", 5, 111), // td + org + total
                ],
            });

            const result = await callService();

            // total = all 4 rows
            expect(result.total.daily[0].installs).toBe(40);
            // org = offer_group_id !== 10 → 3 rows
            expect(result.org.daily[0].installs).toBe(30);
            // rent = offer_group_id === 10 → 1 row
            expect(result.rent.daily[0].installs).toBe(10);
            // td = campaign_id in {518, 111} → 2 rows
            expect(result.td.daily[0].installs).toBe(20);
        });

        it("org contains revenue, rent/td/total do not", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-01", 5, 100, 10, 5, 2, 99), // org
                    ROW("2026-05-01", 10, 518, 10, 5, 2, 99), // rent + td
                ],
            });

            const result = await callService();

            expect((result.org.daily[0] as any).revenue).toBe(99);
            expect((result.total.daily[0] as any).revenue).toBeUndefined();
            expect((result.rent.daily[0] as any).revenue).toBeUndefined();
            expect((result.td.daily[0] as any).revenue).toBeUndefined();
        });
    });

    describe("daily aggregation", () => {
        it("merges rows of the same day across different campaigns", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-01", 5, 100, 3, 1, 0, 0),
                    ROW("2026-05-01", 5, 101, 7, 4, 2, 50),
                ],
            });

            const result = await callService();
            const day = result.total.daily[0];

            expect(day.date).toBe("2026-05-01");
            expect(day.installs).toBe(10);
            expect(day.registrations).toBe(5);
            expect(day.deposits).toBe(2);
        });

        it("sorts daily array by date ascending", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-03", 5, 100),
                    ROW("2026-05-01", 5, 100),
                    ROW("2026-05-02", 5, 100),
                ],
            });

            const result = await callService();
            const dates = result.total.daily.map((d) => d.date);

            expect(dates).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
        });
    });

    describe("summary", () => {
        it("calculates summary as sum of all daily entries", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-01", 5, 100, 10, 2, 1, 0),
                    ROW("2026-05-02", 5, 100, 20, 3, 2, 0),
                ],
            });

            const result = await callService();
            const { summary } = result.total;

            expect(summary.installs).toBe(30);
            expect(summary.registrations).toBe(5);
            expect(summary.deposits).toBe(3);
        });

        it("calculates org summary including revenue", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [
                    ROW("2026-05-01", 5, 100, 10, 2, 1, 40),
                    ROW("2026-05-02", 5, 100, 20, 3, 2, 60),
                ],
            });

            const result = await callService();
            const summary = result.org.summary as any;

            expect(summary.revenue).toBe(100);
        });
    });

    describe("edge cases", () => {
        it("returns empty datasets when rows is empty", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({ rows: [] });

            const result = await callService();

            expect(result.total.daily).toHaveLength(0);
            expect(result.total.summary.installs).toBe(0);
            expect(result.org.daily).toHaveLength(0);
        });

        it("returns empty datasets when buildReport returns null", async () => {
            mockKeitaroService.buildReport.mockResolvedValue(null);

            const result = await callService();

            expect(result.total.daily).toHaveLength(0);
        });

        it("excludes campaign_id=518 from rent but includes in td", async () => {
            mockKeitaroService.buildReport.mockResolvedValue({
                rows: [ROW("2026-05-01", 10, 518)],
            });

            const result = await callService();

            expect(result.rent.daily[0].installs).toBe(10);
            expect(result.td.daily[0].installs).toBe(10);
        });
    });
});
