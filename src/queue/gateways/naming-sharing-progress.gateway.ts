import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "../../utils/logger";

export interface NamingSharingProgress {
    jobId: string;
    total: number;
    processed: number;
    success: number;
    failed: number;
    batchNumber: number;
    totalBatches: number;
}

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
}
