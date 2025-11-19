import { Module } from "@nestjs/common";
import { ReportController } from "./report.controller";
import { ReportService } from "./report.service";
import { KeitaroService } from "../keitaro/keitaro.service";

@Module({
    controllers: [ReportController],
    providers: [ReportService, KeitaroService],
})
export class ReportModule {}
