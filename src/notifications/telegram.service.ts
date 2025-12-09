import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class TelegramService {
    private readonly logger = new Logger(TelegramService.name);
    private readonly botToken: string;
    private readonly chatId: string;
    private readonly apiUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.botToken = this.configService.get<string>("telegram.botToken");
        this.chatId = this.configService.get<string>("telegram.chatId");
        this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    /**
     * Відправляє алерт про успішну заміну офера під час failover
     */
    async sendFailoverSuccessAlert(
        bannedAppId: string,
        currentAppId: string,
        platform: string,
    ): Promise<void> {
        if (!this.botToken || !this.chatId) {
            this.logger.warn(
                "Telegram bot token or chat ID not configured, skipping notification",
            );
            return;
        }

        const message = this.formatFailoverSuccessMessage(
            bannedAppId,
            currentAppId,
            platform,
        );

        try {
            await this.sendMessage(message);
            this.logger.log(
                `Failover success alert sent for app ${bannedAppId}`,
            );
        } catch (error) {
            this.logger.error(
                `Failed to send failover success alert: ${error.message}`,
            );
        }
    }

    /**
     * Відправляє алерт про невідповідність конфігурації потоку
     */
    async sendStreamConfigAlert(
        configIssues: string[],
        streamId: number,
        campaignId: number,
    ): Promise<void> {
        if (!this.botToken || !this.chatId) {
            this.logger.warn(
                "Telegram bot token or chat ID not configured, skipping notification",
            );
            return;
        }

        const message = this.formatStreamConfigMessage(
            configIssues,
            streamId,
            campaignId,
        );

        try {
            await this.sendMessage(message);
            this.logger.log(`Stream config alert sent for stream ${streamId}`);
        } catch (error) {
            this.logger.error(
                `Failed to send stream config alert: ${error.message}`,
            );
        }
    }

    /**
     * Базовий метод для відправки повідомлення в Telegram
     */
    private async sendMessage(text: string): Promise<void> {
        const url = `${this.apiUrl}/sendMessage`;
        const payload = {
            chat_id: this.chatId,
            text,
            parse_mode: "HTML",
        };

        await axios.post(url, payload);
    }

    /**
     * Форматує повідомлення про успішний failover
     */
    private formatFailoverSuccessMessage(
        bannedAppId: string,
        currentAppId: string,
        platform: string,
    ): string {
        const timestamp = new Date().toISOString();
        return `
🔄 <b>Failover Success Alert</b>

⚠️ <b>Banned App:</b> ${platform}/${bannedAppId}
✅ <b>Replacement App:</b> ${platform}/${currentAppId}
📱 <b>Platform:</b> ${platform}
🕐 <b>Time:</b> ${timestamp}

The offer has been successfully replaced in the stream.
        `.trim();
    }

    /**
     * Форматує повідомлення про невідповідність конфігурації потоку
     */
    private formatStreamConfigMessage(
        configIssues: string[],
        streamId: number,
        campaignId: number,
    ): string {
        const timestamp = new Date().toISOString();
        const issuesList = configIssues
            .map((issue) => `  • ${issue}`)
            .join("\n");

        return `
⚠️ <b>Stream Configuration Alert</b>

🔴 <b>Stream ID:</b> ${streamId}
📊 <b>Campaign ID:</b> ${campaignId}
🕐 <b>Time:</b> ${timestamp}

<b>Configuration Issues:</b>
${issuesList}

Please check and fix the stream configuration immediately.
        `.trim();
    }
}
