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
    database: {
        dev_uri: process.env.MONGO_DATABASE_URI_DEV,
        prod_uri: process.env.MONGO_DATABASE_URI,
    },
});
