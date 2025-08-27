import { All, Controller, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";

import { TokenGuard } from "../auth/token.guard";
import { KeitaroProxyService } from "./keitaro-proxy.service";

@Controller("keitaro")
@UseGuards(TokenGuard)
export class KeitaroProxyController {
    constructor(private readonly keitaroProxyService: KeitaroProxyService) {}

    @All("*")
    async proxyRequest(@Req() req: Request, @Res() res: Response) {
        return this.keitaroProxyService.proxyRequest(req, res);
    }
}
