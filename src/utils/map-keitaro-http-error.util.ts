import {
    HttpException,
    HttpStatus,
    InternalServerErrorException,
} from "@nestjs/common";
import axios from "axios";

export function mapKeitaroErrorToHttpException(error: unknown): Error {
    if (error instanceof HttpException) {
        return error;
    }

    if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? HttpStatus.BAD_GATEWAY;
        const upstreamBody = error.response?.data;

        return new HttpException(
            {
                message: "Keitaro Admin API error",
                keitaroStatus: status,
                error: upstreamBody ?? error.message,
            },
            status >= 400 && status < 600 ? status : HttpStatus.BAD_GATEWAY,
        );
    }

    if (error instanceof Error) {
        return error;
    }

    return new InternalServerErrorException(String(error));
}
