export default () => ({
    port: parseInt(process.env.PORT, 10) || 5005,
    NODE_ENV: process.env.NODE_ENV || "development",
    auth: {
        token: process.env.AUTH_TOKEN,
    },
    keitaro: {
        keitaroDomainDev: process.env.KEITARO_DOMAIN_DEV,
        keitaroDomain: process.env.KEITARO_DOMAIN,
        apiKey: process.env.KEITARO_API_KEY,
        apiKeyDev: process.env.KEITARO_API_KEY_DEV,
        orgGroupId: parseInt(process.env.KEITARO_ORG_GROUP_ID, 10),
        cloGroupId: parseInt(process.env.KEITARO_CLO_GROUP_ID, 10),
        iosCloCampaignTemplateId: parseInt(
            process.env.IOS_CLO_CAMPAIGN_TEMPLATE_ID,
            10,
        ),
        newFlowCloCampaignTemplateId: parseInt(
            process.env.NEW_FLOW_CLO_CAMPAIGN_TEMPLATE_ID,
            10,
        ),
        iosOrgCampaignTemplateId: parseInt(
            process.env.IOS_ORG_CAMPAIGN_TEMPLATE_ID,
            10,
        ),
        androidCloCampaignTemplateId: parseInt(
            process.env.ANDROID_CLO_CAMPAIGN_TEMPLATE_ID,
            10,
        ),
        androidOrgCampaignTemplateId: parseInt(
            process.env.ANDROID_ORG_CAMPAIGN_TEMPLATE_ID,
            10,
        ),
        iosSubId: process.env.IOS_SUB_ID,
        androidSubId: process.env.ANDROID_SUB_ID,
    },
    failover: {
        // Campaign Groups
        campaignGroupId:
            parseInt(process.env.APPLINK_CAMPAIGN_GROUP_ID, 10) || 0,
        bannedCampaignGroupId:
            parseInt(process.env.APPLINK_BANNED_CAMPAIGN_GROUP_ID, 10) || 0,
        defaultCampaignId:
            parseInt(process.env.DEFAULT_APPLINK_CAMPAIGN_ID, 10) || 0,
        minCampaignId: parseInt(process.env.MIN_CAMPAIGN_ID, 10) || 0,

        // Domain Groups
        bannedDomainGroupId:
            parseInt(process.env.APPLINK_BANNED_DOMAIN_GROUP_ID, 10) || 0,

        // Offer Groups
        privateOfferGroupId:
            parseInt(process.env.APPLINK_PRIVATE_OFFER_GROUP_ID, 10) || 0,
        publicOfferGroupId:
            parseInt(process.env.APPLINK_PUBLIC_OFFER_GROUP_ID, 10) || 0,
        bannedOfferGroupId:
            parseInt(process.env.APPLINK_BANNED_OFFER_GROUP_ID, 10) || 0,

        // Stream Configuration
        defaultStreamId: parseInt(process.env.DEFAULT_STREAM_ID, 10) || 0,
        streamLandingId: parseInt(process.env.STREAM_LANDING_ID, 10) || 0,

        // Pagination
        campaignsPageSize: parseInt(process.env.CAMPAIGNS_PAGE_SIZE, 10) || 100,
    },
    database: {
        dev_uri: process.env.MONGO_DATABASE_URI_DEV,
        prod_uri: process.env.MONGO_DATABASE_URI,
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN,
        chatId: process.env.TELEGRAM_CHAT_ID,
    },
});
