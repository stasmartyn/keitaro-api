import { Injectable, Inject, OnModuleDestroy } from "@nestjs/common";
import { Queue, QueueOptions } from "bullmq";
import { QUEUE_FACTORY, QueueFactory } from "./queue.providers";
import { Logger } from "../utils/logger";
import {
    NAMING_SHARING_QUEUE_NAME,
    namingSharingQueueOptions,
} from "./queues/naming-sharing.queue";
import {
    NAMING_SHARING_DLQ_QUEUE_NAME,
    namingSharingDlqQueueOptions,
} from "./queues/naming-sharing-dlq.queue";

@Injectable()
export class QueueService implements OnModuleDestroy {
    private queues: Map<string, Queue> = new Map();

    constructor(
        @Inject(QUEUE_FACTORY) private readonly queueFactory: QueueFactory,
    ) {}

    getQueue(name: string, options?: Partial<QueueOptions>): Queue {
        if (!this.queues.has(name)) {
            const queue = this.queueFactory.createQueue(name, options);
            this.queues.set(name, queue);
        }

        return this.queues.get(name)!;
    }

    /**
     * Отримує чергу naming-sharing з попередньо налаштованими параметрами
     * (3 спроби, backoff: 1h для всіх attempts, DLQ підтримка)
     */
    getNamingSharingQueue(): Queue {
        return this.getQueue(
            NAMING_SHARING_QUEUE_NAME,
            namingSharingQueueOptions,
        );
    }

    /**
     * Отримує DLQ чергу для naming-sharing
     */
    getNamingSharingDlqQueue(): Queue {
        return this.getQueue(
            NAMING_SHARING_DLQ_QUEUE_NAME,
            namingSharingDlqQueueOptions,
        );
    }

    async clearQueue(name: string): Promise<void> {
        const queue = this.queues.get(name);
        if (queue) {
            await queue.obliterate({ force: true });
            Logger.info(`Queue ${name} cleared`, undefined, "QueueService");
        }
    }

    async clearNamingSharingQueue(): Promise<void> {
        await this.clearQueue(NAMING_SHARING_QUEUE_NAME);
    }

    async closeAll(): Promise<void> {
        const closePromises = Array.from(this.queues.values()).map((queue) =>
            queue.close(),
        );
        await Promise.all(closePromises);
        this.queues.clear();
        Logger.info("All queues closed", undefined, "QueueService");
    }

    async onModuleDestroy(): Promise<void> {
        await this.closeAll();
    }
}
