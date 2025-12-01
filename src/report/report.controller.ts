import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ReportService } from "./report.service";
import { TokenGuard } from "../auth/token.guard";

@Controller("report")
@UseGuards(TokenGuard)
export class ReportController {
    constructor(private readonly reportService: ReportService) {}

    @Post("build")
    async buildReport(@Body() body: Record<string, any>) {
        return this.reportService.buildReport(body);
    }

    @Post("conversion/log")
    async conversionLog(@Body() body: Record<string, any>) {
        return this.reportService.conversionLog(body);
    }

    @Post("stats")
    async stats(@Body() body: Record<string, any>) {
        return this.reportService.stats(body);
    }

    @Post("clicks/log")
    async clicksLog(@Body() body: Record<string, any>) {
        return this.reportService.clicksLog(body);
    }
}
