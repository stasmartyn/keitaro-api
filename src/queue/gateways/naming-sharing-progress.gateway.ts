import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "../../utils/logger";
import {
    NamingSharingProgress,
    NamingSharingResult,
} from "../queues/naming-sharing.types";

@WebSocketGateway({
    namespace: "/naming-sharing-progress",
    cors: {
        origin: "*",
    },
})
export class NamingSharingProgressGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    afterInit() {
        Logger.info(
            "NamingSharingProgressGateway initialized",
            undefined,
            "NamingSharingProgressGateway",
        );
    }

    handleConnection(client: Socket) {
        Logger.info(
            `Client connected: ${client.id}`,
            undefined,
            "NamingSharingProgressGateway",
        );
    }

    handleDisconnect(client: Socket) {
        Logger.info(
            `Client disconnected: ${client.id}`,
            undefined,
            "NamingSharingProgressGateway",
        );
    }

    sendProgress(progress: NamingSharingProgress) {
        this.server.emit("progress", progress);
    }

    sendComplete(complete: {
        jobId: string;
        total: number;
        success: number;
        failed: number;
        results?: NamingSharingResult[];
    }) {
        this.server.emit("complete", complete);
    }
}
