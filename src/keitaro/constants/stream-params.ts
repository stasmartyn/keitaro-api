export const streamParams = (
    isAndroid: boolean,
    falseFilters: string[] = [],
) => {
    const baseStreams = [
        {
            type: "forced",
            name: "false GEO",
            position: 2,
            weight: 0,
            action_options: {},
            comments: "First stream",
            state: "active",
            action_type: "do_nothing",
            schema: "action",
            collect_clicks: true,
            filter_or: true,
            filters: [
                { name: "country", mode: "reject", payload: falseFilters },
                { name: "bot", mode: "accept", payload: null },
            ],
            triggers: [],
            landings: [],
            offers: [],
        },
        {
            type: "regular",
            name: "true",
            position: 3,
            weight: 100,
            action_options: {},
            comments: "Second stream",
            state: "active",
            action_type: "local_file",
            schema: "landings",
            collect_clicks: true,
            filter_or: false,
            filters: [{ name: "sub_id_1", mode: "reject", payload: ["111"] }],
            triggers: [],
            landings: [{ landing_id: 2, state: "active", share: 100 }],
            offers: [],
        },
        {
            type: "default",
            name: "close-false",
            position: 4,
            weight: 0,
            action_options: {},
            comments: "Third stream",
            state: "active",
            action_type: "do_nothing",
            action_payload: "",
            schema: "action",
            collect_clicks: true,
            filter_or: false,
            filters: [],
            triggers: [],
            landings: [],
            offers: [],
        },
    ];

    const androidStreams = isAndroid
        ? [
              {
                  type: "forced",
                  name: "false ISP",
                  position: 1,
                  action_options: null,
                  comments: "",
                  state: "active",
                  action_type: "http",
                  action_payload: "",
                  schema: "landings",
                  collect_clicks: true,
                  filter_or: false,
                  weight: 0,
                  offer_selection: "before_click",
                  filters: [
                      {
                          name: "isp",
                          mode: "accept",
                          payload: [
                              "Google",
                              "Google Access LLC",
                              "Google Cloud",
                              "Google Fiber",
                              "Google Ireland Limited",
                              "Google Kenya",
                              "Google Switzerland GmbH",
                              "Google UK Limited",
                              "Googlebot",
                              "Google LLC",
                          ],
                      },
                  ],
                  triggers: [],
                  landings: [],
                  offers: [],
              },
              {
                  type: "forced",
                  name: "false Device",
                  position: 2,
                  action_options: null,
                  comments: "",
                  state: "active",
                  action_type: "http",
                  action_payload: "",
                  schema: "landings",
                  collect_clicks: true,
                  filter_or: false,
                  weight: 0,
                  offer_selection: "before_click",
                  filters: [
                      {
                          name: "device_model",
                          mode: "accept",
                          payload: [
                              "OnePlus 8Pro",
                              "Google Pixel 4a",
                              "Google Pixel 4a (5G)",
                          ],
                      },
                  ],
                  triggers: [],
                  landings: [],
                  offers: [],
              },
              {
                  type: "forced",
                  name: "false WebProxy",
                  position: 3,
                  action_options: null,
                  comments: "",
                  state: "active",
                  action_type: "http",
                  action_payload: "",
                  schema: "landings",
                  collect_clicks: true,
                  filter_or: false,
                  weight: 0,
                  offer_selection: "before_click",
                  filters: [{ name: "proxy", mode: "accept", payload: null }],
                  triggers: [],
                  landings: [],
                  offers: [],
              },
              {
                  type: "forced",
                  name: "false Bot",
                  position: 4,
                  action_options: null,
                  comments: "",
                  state: "active",
                  action_type: "http",
                  action_payload: "",
                  schema: "landings",
                  collect_clicks: true,
                  filter_or: false,
                  weight: 100,
                  offer_selection: "before_click",
                  filters: [{ name: "bot", mode: "accept", payload: null }],
                  triggers: [],
                  landings: [],
                  offers: [],
              },
          ]
        : [];

    const allStreams = [...androidStreams, ...baseStreams];

    return allStreams.map((stream, index) => ({
        ...stream,
        position: index + 1,
    }));
};

export const orgStreamParams = (
    isIos: boolean,
    falseFilters: string[] = [],
    testFlowOfferId: number = 3412,
) => {
    const streams = [
        {
            type: "forced",
            name: "false",
            position: 2,
            weight: 0,
            action_options: {},
            comments: "First stream",
            state: "active",
            action_type: "http",
            schema: "landings",
            collect_clicks: true,
            filter_or: true,
            filters: [
                { name: "country", mode: "reject", payload: falseFilters },
                { name: "bot", mode: "accept", payload: null },
            ],
            triggers: [],
            landings: [],
            offers: [],
        },
        {
            type: "regular",
            name: "TEST",
            position: 3,
            weight: 100,
            action_options: {},
            comments: "Second stream",
            state: isIos ? "active" : "disabled",
            action_type: "local_file",
            schema: "landings",
            collect_clicks: true,
            filter_or: false,
            filters: [
                { name: "country", mode: "accept", payload: falseFilters },
            ],
            triggers: [],
            landings: [],
            offers: [
                {
                    offer_id: testFlowOfferId,
                    share: 100,
                    state: "active",
                },
            ],
        },
        {
            type: "default",
            name: "Moloko",
            position: 4,
            weight: 0,
            action_options: {},
            comments: "Third stream",
            state: "active",
            action_type: "moloko",
            action_payload: "4664343293",
            schema: "action",
            collect_clicks: true,
            filter_or: false,
            filters: [],
            triggers: [],
            landings: [],
            offers: [],
        },
    ];

    return streams.map((stream, index) => ({
        ...stream,
        position: index + 1,
    }));
};

/** iOS forced stream payload (app_install_data_filter_new). Reused in noOrgStreamParams and create-empty-campaign. */
export const getIosForcedStreamPayload = () => ({
    type: "forced",
    name: "forced",
    position: 1,
    weight: 0,
    action_options: {},
    comments: "",
    state: "active",
    action_type: "http",
    action_payload: "",
    schema: "landings",
    collect_clicks: true,
    filter_or: true,
    filters: [
        {
            name: "app_install_data_filter_new",
            mode: "reject",
            payload: "Lead",
        },
    ],
    triggers: [],
    landings: [],
    offers: [],
});

export const noOrgStreamParams = (
    isIos: boolean,
    testFlowOfferId: number = 3412,
) => {
    const streams = [
        {
            type: "regular",
            name: "UA",
            position: 2,
            weight: 100,
            action_options: {},
            comments: "Second stream",
            state: "disabled",
            action_type: "http",
            schema: "landings",
            collect_clicks: true,
            filter_or: false,
            filters: [
                {
                    name: "country",
                    mode: "accept",
                    payload: ["UA", "PL"],
                },
            ],
            triggers: [],
            landings: [],
            offers: [
                {
                    offer_id: testFlowOfferId,
                    share: 100,
                    state: "active",
                },
            ],
        },
        {
            type: "default",
            name: "Moloko",
            position: 3,
            weight: 0,
            action_options: {},
            comments: "Third stream",
            state: "active",
            action_type: "moloko",
            action_payload: "",
            schema: "action",
            collect_clicks: true,
            filter_or: false,
            filters: [],
            triggers: [],
            landings: [],
            offers: [],
        },
    ];

    if (isIos) {
        streams.unshift(getIosForcedStreamPayload());
    }

    return streams.map((stream, index) => ({
        ...stream,
        position: index + 1,
    }));
};
