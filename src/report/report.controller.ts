import {
    Body,
    Controller,
    Post,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from "@nestjs/common";
import { ReportService } from "./report.service";
import { TokenGuard } from "../auth/token.guard";
import { Public } from "../auth/public.decorator";
import { ExportTokenGuard } from "../auth/export-token.guard";
import { BusinessResultsRequestDto } from "./dto/business-results-request.dto";
import { BusinessResultsResponse } from "./interfaces/business-results.interface";

const EXPORT_VALIDATION_PIPE = new ValidationPipe({
    transform: true,
    whitelist: true,
});

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

    /** Навмисно публічний: глобальний TokenGuard ігнорується; доступ лише через Bearer EXPORT_TOKEN (ExportTokenGuard). */
    @Public()
    @UseGuards(ExportTokenGuard)
    @UsePipes(EXPORT_VALIDATION_PIPE)
    @Post("business-results")
    async businessResults(
        @Body() dto: BusinessResultsRequestDto,
    ): Promise<BusinessResultsResponse> {
        return this.reportService.getBusinessResults(dto);
    }
}
