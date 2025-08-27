import { Module } from "@nestjs/common";
import { OffersService } from "./offers.service";
import { OffersController } from "./offers.controller";
import { KeitaroService } from "../keitaro/keitaro.service";

@Module({
    providers: [OffersService, KeitaroService],
    controllers: [OffersController],
})
export class OffersModule {}
