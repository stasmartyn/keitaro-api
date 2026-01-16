export default () => {
    const {
        PORT,
        NODE_ENV,
        AUTH_TOKEN,
        AUTH_ENABLED,
        KEITARO_DOMAIN_DEV,
        KEITARO_DOMAIN,
        KEITARO_API_KEY,
        KEITARO_API_KEY_DEV,
        KEITARO_ORG_GROUP_ID,
        KEITARO_CLO_GROUP_ID,
        IOS_CLO_CAMPAIGN_TEMPLATE_ID,
        NEW_FLOW_CLO_CAMPAIGN_TEMPLATE_ID,
        IOS_ORG_CAMPAIGN_TEMPLATE_ID,
        ANDROID_CLO_CAMPAIGN_TEMPLATE_ID,
        ANDROID_ORG_CAMPAIGN_TEMPLATE_ID,
        IOS_SUB_ID,
        ANDROID_SUB_ID,
        KEITARO_TEST_FLOW_OFFER_ID,
        APPLINK_CAMPAIGN_GROUP_ID,
        APPLINK_BANNED_CAMPAIGN_GROUP_ID,
        DEFAULT_APPLINK_CAMPAIGN_ID,
        MIN_CAMPAIGN_ID,
        APPLINK_BANNED_DOMAIN_GROUP_ID,
        APPLINK_PRIVATE_OFFER_GROUP_ID,
        APPLINK_PUBLIC_OFFER_GROUP_ID,
        APPLINK_BANNED_OFFER_GROUP_ID,
        DEFAULT_STREAM_ID,
        STREAM_LANDING_ID,
        CAMPAIGNS_PAGE_SIZE,
        MONGO_DATABASE_URI_DEV,
        MONGO_DATABASE_URI,
        REDIS_HOST,
        REDIS_PORT,
        REDIS_PASSWORD,
        REDIS_DB,
        REDIS_TLS,
        REDIS_USERNAME,
        REDIS_URL,
        TELEGRAM_BOT_TOKEN,
        TELEGRAM_CHAT_ID,
    } = process.env;

    return {
        port: parseInt(PORT, 10) || 5005,
        NODE_ENV: NODE_ENV || "development",
        auth: {
            token: AUTH_TOKEN,
            enabled: AUTH_ENABLED !== "false",
        },
        keitaro: {
            keitaroDomainDev: KEITARO_DOMAIN_DEV,
            keitaroDomain: KEITARO_DOMAIN,
            apiKey: KEITARO_API_KEY,
            apiKeyDev: KEITARO_API_KEY_DEV,
            orgGroupId: parseInt(KEITARO_ORG_GROUP_ID, 10),
            cloGroupId: parseInt(KEITARO_CLO_GROUP_ID, 10),
            iosCloCampaignTemplateId: parseInt(
                IOS_CLO_CAMPAIGN_TEMPLATE_ID,
                10,
            ),
            newFlowCloCampaignTemplateId: parseInt(
                NEW_FLOW_CLO_CAMPAIGN_TEMPLATE_ID,
                10,
            ),
            iosOrgCampaignTemplateId: parseInt(
                IOS_ORG_CAMPAIGN_TEMPLATE_ID,
                10,
            ),
            androidCloCampaignTemplateId: parseInt(
                ANDROID_CLO_CAMPAIGN_TEMPLATE_ID,
                10,
            ),
            androidOrgCampaignTemplateId: parseInt(
                ANDROID_ORG_CAMPAIGN_TEMPLATE_ID,
                10,
            ),
            iosSubId: IOS_SUB_ID,
            androidSubId: ANDROID_SUB_ID,
            testFlowOfferId: parseInt(KEITARO_TEST_FLOW_OFFER_ID || "3412", 10),
        },
        failover: {
            // Campaign Groups
            campaignGroupId: parseInt(APPLINK_CAMPAIGN_GROUP_ID, 10) || 0,
            bannedCampaignGroupId:
                parseInt(APPLINK_BANNED_CAMPAIGN_GROUP_ID, 10) || 0,
            defaultCampaignId: parseInt(DEFAULT_APPLINK_CAMPAIGN_ID, 10) || 0,
            minCampaignId: parseInt(MIN_CAMPAIGN_ID, 10) || 0,

            // Domain Groups
            bannedDomainGroupId:
                parseInt(APPLINK_BANNED_DOMAIN_GROUP_ID, 10) || 0,

            // Offer Groups
            privateOfferGroupId:
                parseInt(APPLINK_PRIVATE_OFFER_GROUP_ID, 10) || 0,
            publicOfferGroupId:
                parseInt(APPLINK_PUBLIC_OFFER_GROUP_ID, 10) || 0,
            bannedOfferGroupId:
                parseInt(APPLINK_BANNED_OFFER_GROUP_ID, 10) || 0,

            // Stream Configuration
            defaultStreamId: parseInt(DEFAULT_STREAM_ID, 10) || 0,
            streamLandingId: parseInt(STREAM_LANDING_ID, 10) || 0,

            // Pagination
            campaignsPageSize: parseInt(CAMPAIGNS_PAGE_SIZE, 10) || 100,
        },
        database: {
            dev_uri: MONGO_DATABASE_URI_DEV,
            prod_uri: MONGO_DATABASE_URI,
        },
        redis: {
            host: REDIS_HOST || "localhost",
            port: parseInt(REDIS_PORT, 10) || 6379,
            password: REDIS_PASSWORD || undefined,
            db: parseInt(REDIS_DB, 10) || 0,
            tls: REDIS_TLS === "true",
            username: REDIS_USERNAME || undefined,
            url: REDIS_URL || undefined,
        },
        telegram: {
            botToken: TELEGRAM_BOT_TOKEN,
            chatId: TELEGRAM_CHAT_ID,
        },
    };
};
