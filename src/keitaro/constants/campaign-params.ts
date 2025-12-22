import { CreateCampaignInterface } from "../interfaces/create-campaign.interface";

export const campaignParams = (
    data: CreateCampaignInterface,
    isOnelink: boolean = false,
) => {
    const { name, alias, group_id, traffic_source_id, sub_id } = data;
    const baseParams = {
        keyword: { name: "keyword", placeholder: "", alias: "" },
        cost: { name: "cost", placeholder: "", alias: "" },
        currency: { name: "currency", placeholder: "", alias: "" },
        external_id: { name: "external_id", placeholder: "", alias: "" },
        creative_id: { name: "creative_id", placeholder: "", alias: "" },
        ad_campaign_id: { name: "ad_campaign_id", placeholder: "", alias: "" },
        source: { name: "source", placeholder: "", alias: "" },
    };

    const generateSubIdParams = (isDefault = false) => {
        const params = {};
        for (let i = 1; i <= 30; i++) {
            const specialCases = isDefault
                ? {
                      2: { name: "sub2", placeholder: "{sub2}", alias: "" },
                      3: { name: "sub3", placeholder: "{sub3}", alias: "" },
                      4: { name: "sub4", placeholder: "{sub4}", alias: "" },
                      5: { name: "sub5", placeholder: "{sub5}", alias: "" },
                      10: { name: "", placeholder: "", alias: "bundle_id" },
                      11: {
                          name: "source",
                          placeholder: "{source}",
                          alias: "source",
                      },
                      12: {
                          name: "advertising_id",
                          placeholder: "{advertising_id}",
                          alias: "advertising_id",
                      },
                      13: {
                          name: "adjust_id",
                          placeholder: "{adjust_id}",
                          alias: "adjust_id",
                      },
                      14: {
                          name: "appsflyer_device_id",
                          placeholder: "{appsflyer_device_id}",
                          alias: "appsflyer_device_id",
                      },
                      15: {
                          name: "user_id",
                          placeholder: "71",
                          alias: "user_id",
                      },
                      17: { name: "naming", placeholder: "", alias: "" },
                      25: { name: "domain", placeholder: "", alias: "" },
                      26: { name: "fbclid", placeholder: "", alias: "" },
                      27: { name: "pixel", placeholder: "", alias: "" },
                      28: { name: "", placeholder: "", alias: "fbp" },
                      29: { name: "", placeholder: "", alias: "fbc" },
                  }
                : {
                      2: {
                          name: "sub2",
                          placeholder: "{sub2}",
                          alias: "accountid",
                      },
                      3: {
                          name: "sub3",
                          placeholder: "{sub3}",
                          alias: "adsetid",
                      },
                      4: {
                          name: "sub4",
                          placeholder: "{sub4}",
                          alias: "creoid",
                      },
                      5: {
                          name: "sub5",
                          placeholder: "{sub5}",
                          alias: "creogroup",
                      },
                      10: {
                          name: "bundle_id",
                          placeholder: "{bundle_id}",
                          alias: "bundle_id",
                      },
                      11: {
                          name: "onesignal_id",
                          placeholder: "{onesignal_id}",
                          alias: "onesignal_id",
                      },
                      12: {
                          name: "advertising_id",
                          placeholder: "{advertising_id}",
                          alias: "advertising_id",
                      },
                      13: {
                          name: "adjust_id",
                          placeholder: "{adjust_id}",
                          alias: "adjust_id",
                      },
                      14: {
                          name: "appsflyer_device_id",
                          placeholder: "{appsflyer_device_id}",
                          alias: "appsflyer_device_id",
                      },
                      15: {
                          name: "user_id",
                          placeholder: sub_id || "321",
                          alias: "",
                      },
                      17: {
                          name: "naming",
                          placeholder: "{naming}",
                          alias: "naming",
                      },
                      18: {
                          name: "external_keitaro_subid",
                          placeholder: "{external_keitaro_subid}",
                          alias: "external_keitaro_subid",
                      },
                      19: {
                          name: "server_check",
                          placeholder: "{server_check}",
                          alias: "server_check",
                      },
                      20: {
                          name: "source",
                          placeholder: "{source}",
                          alias: "source",
                      },
                      25: {
                          name: "domain",
                          placeholder: "{domain}",
                          alias: "domain",
                      },
                      26: {
                          name: "fbclid",
                          placeholder: "{fbclid}",
                          alias: "fbclid",
                      },
                  };

            if (specialCases[i]) {
                params[`sub_id_${i}`] = specialCases[i];
            } else {
                params[`sub_id_${i}`] = {
                    name: i === 1 ? "sub1" : `sub${i}`,
                    placeholder: `{sub${i}}`,
                    alias: "",
                };
            }
        }

        if (isOnelink) {
            params["sub_id_23"] = {
                name: "ttclid",
                placeholder: "",
                alias: "ttclid",
            };
            params["sub_id_24"] = {
                name: "tt_pixel",
                placeholder: "",
                alias: "tt_pixel",
            };
        }
        return params;
    };

    const extraParams = {
        extra_param_1: {
            name: "id_type",
            placeholder: "{id_type}",
            alias: "id_type",
        },
        extra_param_2: {
            name: "player_id",
            placeholder: "{player_id}",
            alias: "player_id",
        },
        extra_param_3: {
            name: "install_date",
            placeholder: "{install_date}",
            alias: "install_date",
        },
        extra_param_4: {
            name: "app_source",
            placeholder: "{app_source}",
            alias: "app_source",
        },
        extra_param_5: {
            name: "app_medium",
            placeholder: "{app_medium}",
            alias: "app_medium",
        },
        extra_param_6: {
            name: "app_term",
            placeholder: "{app_term}",
            alias: "app_term",
        },
        extra_param_7: {
            name: "app_content",
            placeholder: "{app_content}",
            alias: "app_content",
        },
        extra_param_8: {
            name: "app_campaign",
            placeholder: "{app_campaign}",
            alias: "app_campaign",
        },
        extra_param_9: {
            name: "version",
            placeholder: "{version}",
            alias: "version",
        },
    };

    const parameters = {
        ...baseParams,
        ...generateSubIdParams(traffic_source_id === 0),
        ...extraParams,
    };

    return {
        name,
        alias,
        type: "weight",
        uniqueness_method: "ip_ua",
        cookies_ttl: 8760,
        position: 9999,
        state: "active",
        cost_type: "CPS",
        cost_value: 0,
        cost_currency: "USD",
        group_id,
        bind_visitors: "slo",
        traffic_source_id,
        cost_auto: true,
        domain_id: 1,
        notes: "",
        parameters,
        uniqueness_use_cookies: true,
        traffic_loss: 0,
    };
};
