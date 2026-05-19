import { Module } from "@nestjs/common";

import { KeitaroModule } from "../keitaro/keitaro.module";
import { W2appController } from "./w2app.controller";
import { W2appService } from "./w2app.service";

@Module({
    imports: [KeitaroModule],
    controllers: [W2appController],
    providers: [W2appService],
})
export class W2appModule {}
