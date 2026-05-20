import { HttpException } from "@nestjs/common";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { mapKeitaroErrorToHttpException } from "./map-keitaro-http-error.util";

describe("mapKeitaroErrorToHttpException", () => {
    it("мапить axios 402 без сирого body", () => {
        const error = new AxiosError(
            "Payment Required",
            AxiosError.ERR_BAD_REQUEST,
            undefined,
            undefined,
            {
                status: 402,
                statusText: "Payment Required",
                headers: {},
                config: {} as InternalAxiosRequestConfig,
                data: { secret: "x" },
            },
        );

        const ex = mapKeitaroErrorToHttpException(error);

        expect(ex).toBeInstanceOf(HttpException);
        expect((ex as HttpException).getStatus()).toBe(402);
        expect((ex as HttpException).getResponse()).toEqual({
            message: "Keitaro Admin API error",
            keitaroStatus: 402,
        });
    });
});
