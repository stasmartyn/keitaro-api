import { Injectable } from "@nestjs/common";
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
}
