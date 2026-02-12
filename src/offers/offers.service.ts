import { BadRequestException, Injectable } from "@nestjs/common";

import {
    CreateMultipleOffersDto,
    CreateNewPartnerDto,
    CreateSingleOfferAppLinkDto,
    CreateSingleOfferDto,
} from "./dto/create-offers.dto";
import { KeitaroService } from "../keitaro/keitaro.service";
import { generateUniqueAlias } from "../utils/generateUniqueAlias";
import { wrapWithErrorHandler } from "../utils/error-wrapper";
import { IOffer } from "./interfaces/offer.interface";
import { IAffiliateNetwork } from "./interfaces/affiliate-network.interface";
import { CreateRentOfferDto } from "./dto/create-rent-offer.dto";
import { EnableCloakDto } from "./dto/enable-cloak.dto";
import { EnableGraySectionDto } from "./dto/enable-gray-section.dto";

@Injectable()
export class OffersService {
    private readonly SOURCE_MAPPING = {
        FB: "Facebook",
        UAC: "Google_ads",
        ASO: "ASO",
        ACO: "ACO",
        PWA: "PWA",
        PPC: "PPC",
        DG: "DG",
    };
    constructor(private readonly keitaroService: KeitaroService) {}

    async getOffers() {
        const getOffersWithErrorHandler = wrapWithErrorHandler(
            this.getOffersInternal.bind(this),
            {
                functionName: "OffersService.getOffers",
                additionalData: { endpoint: "GET /offers" },
            },
        );

        return getOffersWithErrorHandler();
    }

    async getOffer(id: string) {
        const getOffersWithErrorHandler = wrapWithErrorHandler(
            this.getOfferInternal.bind(this),
            {
                functionName: "OffersService.getOffer",
                additionalData: { endpoint: "GET /offers/:id" },
            },
        );

        return getOffersWithErrorHandler(id);
    }

    async createOffer(body: CreateMultipleOffersDto) {
        const createOfferWithErrorHandler = wrapWithErrorHandler(
            this.createOfferInternal.bind(this),
            {
                functionName: "OffersService.createOffer",
                additionalData: { endpoint: "POST /offers/create/multiple" },
            },
        );

        return createOfferWithErrorHandler(body);
    }

    async createSingleOffer(body: CreateSingleOfferDto) {
        const createSingleOfferWithErrorHandler = wrapWithErrorHandler(
            this.createSingleOfferInternal.bind(this),
            {
                functionName: "OffersService.createSingleOffer",
                additionalData: { endpoint: "POST /offers/create/single" },
            },
        );

        return createSingleOfferWithErrorHandler(body);
    }

    async createSingleOfferAppLink(body: CreateSingleOfferAppLinkDto) {
        const createSingleOfferAppLinkWithErrorHandler = wrapWithErrorHandler(
            this.createSingleOfferAppLinkInternal.bind(this),
            {
                functionName: "OffersService.createSingleOfferAppLink",
                additionalData: {
                    endpoint: "POST /offers/create/single/app-link",
                },
            },
        );

        return createSingleOfferAppLinkWithErrorHandler(body);
    }

    async createNewPartner(body: CreateNewPartnerDto) {
        const createNewPartnerWithErrorHandler = wrapWithErrorHandler(
            this.createNewPartnerInternal.bind(this),
            {
                functionName: "OffersService.createNewPartner",
                additionalData: { endpoint: "POST /offers/create/new-partner" },
            },
        );

        return createNewPartnerWithErrorHandler(body);
    }

    async updateOffer(id: string, body: any) {
        const updateOfferWithErrorHandler = wrapWithErrorHandler(
            this.updateOfferInternal.bind(this),
            {
                functionName: "OffersService.updateOffer",
                additionalData: { endpoint: `PATCH /offers/update/${id}` },
            },
        );

        return updateOfferWithErrorHandler(id, body);
    }

    async deleteOffer(id: string) {
        const deleteOfferWithErrorHandler = wrapWithErrorHandler(
            this.deleteOfferInternal.bind(this),
            {
                functionName: "OffersService.deleteOffer",
                additionalData: { endpoint: `DELETE /offers/${id}` },
            },
        );

        return deleteOfferWithErrorHandler(id);
    }

    async createRentOffer(body: CreateRentOfferDto) {
        const createRentOfferWithErrorHandler = wrapWithErrorHandler(
            this.createRentOfferInternal.bind(this),
            {
                functionName: "OffersService.createRentOffer",
                additionalData: { endpoint: "POST /offers/create/rent-offer" },
            },
        );
        return createRentOfferWithErrorHandler(body);
    }

    private async createRentOfferInternal(body: CreateRentOfferDto) {
        const { name, domain } = body;

        if (!name || !domain) {
            throw new BadRequestException("Missing required fields.");
        }

        const offerParams = {
            name: `[Rent] iOS ${name} ${domain} ${Date.now()}`,
            group_id: 152,
            offer_type: "external",
            action_type: "http",
            action_payload: `https://${domain}/{sub9}?sub2={sub2}&sub3={sub3}&sub4={sub4}&sub5={sub5}&sub6={sub6}&sub7={sub7}&sub8={sub8}&sub9={sub9}&external_id={subid}&bundle_id={bundle_id}&naming={naming}`,
            state: "active",
        };

        return await this.keitaroService.createRentOffer(offerParams);
    }

    private async getOffersInternal() {
        return await this.keitaroService.getOffers();
    }

    private async getOfferInternal(id: string) {
        return await this.keitaroService.getOffer(id);
    }

    private async createOfferInternal(body: CreateMultipleOffersDto) {
        const {
            sources,
            name,
            affiliate_network_id,
            payout_value,
            payout_currency,
            country,
            notes,
            lands,
            payout_auto,
        } = body;

        if (
            !sources ||
            !name ||
            !affiliate_network_id ||
            !payout_value ||
            !payout_currency ||
            !country ||
            !lands
        ) {
            throw new BadRequestException("Missing required fields.");
        }

        const numberOfLands = Object.keys(lands).length;

        if (numberOfLands < 1 || numberOfLands > 20) {
            throw new BadRequestException(
                "The 'lands' field must contain between 1 and 20 key-value pairs.",
            );
        }

        const affiliateNetwork: IAffiliateNetwork =
            await this.keitaroService.getAffiliateNetworkById(
                affiliate_network_id,
            );

        const createdOffers = [];

        for (const landKey in lands) {
            for (const source of sources) {
                const afp10Value = this.SOURCE_MAPPING[source];

                const groups = {
                    282: ["FB"],
                    281: ["ASO", "UAC"],
                };

                let updatedUrl = null;

                if (sources.length > 1) {
                    const url = new URL(lands[landKey]);
                    const urlParams = new URLSearchParams(url.search);
                    urlParams.set("afp10", afp10Value);
                    updatedUrl = `${url.origin}${url.pathname}?${urlParams.toString()}`;
                }

                let group_id = 20;
                for (const group in groups) {
                    if (groups[group].includes(source)) {
                        group_id = Number(group);
                    }
                }

                const action_payload = updatedUrl ? updatedUrl : lands[landKey];

                const offerName = `${source} | ${name} | ${landKey.split(" | ")[0]}`;
                const offerParams = this.buildOfferParams({
                    name: `${offerName} | ${affiliateNetwork.name}`,
                    action_payload,
                    affiliate_network_id,
                    payout_value,
                    payout_currency,
                    country,
                    notes: notes,
                    payout_auto: payout_auto === "false" ? false : true,
                    group_id,
                });

                const offerData: IOffer =
                    await this.keitaroService.createOffer(offerParams);

                const updatedOfferParams = {
                    name: `${offerData.id} | ${offerName}`,
                };
                const updatedOfferData = await this.keitaroService.updateOffer(
                    offerData.id,
                    updatedOfferParams,
                );
                createdOffers.push({
                    source,
                    name: updatedOfferData.name,
                    lands: `${landKey} | ${action_payload}`,
                });
            }
        }
        return { createdOffers };
    }

    private async createSingleOfferInternal(body: CreateSingleOfferDto) {
        const { app_name, bundle_id, attribution_type, attribution_link } =
            body;

        const offerName = `${attribution_type} ${bundle_id} (${app_name})`;
        const offerParams = this.buildOfferParams({
            name: offerName,
            action_payload: attribution_link,
            affiliate_network_id: attribution_type === "affise" ? 596 : 443,
            group_id: 10,
        });

        return await this.keitaroService.createOffer(offerParams);
    }

    private async createSingleOfferAppLinkInternal(
        body: CreateSingleOfferAppLinkDto,
    ) {
        const { group_id, name, link, service_template_id } = body;

        const offerParams = this.buildOfferParams({
            name,
            group_id,
            action_payload: link,
            affiliate_network_id: service_template_id,
        });

        return await this.keitaroService.createOffer(offerParams);
    }

    private async createNewPartnerInternal(body: CreateNewPartnerDto) {
        const { partnerName, mail, urlParams, testLink, testLinkGeo } = body;

        const allAffiliateNetworks =
            await this.keitaroService.getAffiliateNetworks();

        let maxPartnerNumber = 0;

        allAffiliateNetworks.forEach((allAffiliateNetwork) => {
            if (allAffiliateNetwork.name.includes(partnerName)) {
                const [, count] = allAffiliateNetwork.name.split(" | ");
                if (count > maxPartnerNumber) maxPartnerNumber = count;
            }
        });

        const affiliateNetworkBody = {
            name: `${partnerName} | ${++maxPartnerNumber} | ${mail}`,
            postback_url: "https://flowgather.site/e52f0b4/postback",
            offer_param: urlParams,
            notes: `1. Offer's link: link format - ${testLink};`,
        };
        const updatePartnerName = (networkName) => {
            const regex =
                /^(.+?)\s*\|\s*(\d+)\s*\|\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/;

            const match = networkName.match(regex);
            return match ? `${match[1].trim()} | ${match[2].trim()}` : null;
        };

        const affiliateNetworkResponse =
            await this.keitaroService.createAffiliateNetwork(
                affiliateNetworkBody,
            );
        const updatedAffiliateNetworksNames = [
            ...allAffiliateNetworks,
            affiliateNetworkResponse,
        ]
            .map((network) => updatePartnerName(network.name))
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        const offerBody = this.buildOfferParams({
            name: `Test ${partnerName}`,
            group_id: 20,
            action_payload: testLink,
            affiliate_network_id: affiliateNetworkResponse.id,
            payout_currency: "EUR",
            payout_auto: true,
            country: [testLinkGeo],
            notes: "Test",
            action_options: [],
            values: "",
        });

        const offerResponse = await this.keitaroService.createOffer(offerBody);
        const alias = generateUniqueAlias();
        const createdCampaign = await this.keitaroService.createCampaign({
            name: `Test ${partnerName}`,
            alias,
            traffic_source_id: 22,
            group_id: 8,
        });

        const streamData = this.buildStreamData(
            createdCampaign.id,
            offerResponse.id,
        );

        await this.keitaroService.createStream(createdCampaign.id, streamData);

        return {
            name: createdCampaign.name,
            id: createdCampaign.id,
            alias,
            user_id: createdCampaign.parameters.sub_id_15.placeholder,
            updatedAffiliateNetworksNames: [
                ...new Set(updatedAffiliateNetworksNames),
            ],
            newPartnerName: updatePartnerName(affiliateNetworkResponse.name),
            newPartnerId: affiliateNetworkResponse.id,
        };
    }

    private async updateOfferInternal(id: string, body: any) {
        return await this.keitaroService.updateOffer(Number(id), body);
    }

    private async deleteOfferInternal(id: string) {
        return await this.keitaroService.deleteOffer(Number(id));
    }

    async deleteAffiliateNetwork(id: string) {
        const deleteAffiliateNetworkWithErrorHandler = wrapWithErrorHandler(
            this.deleteAffiliateNetworkInternal.bind(this),
            {
                functionName: "OffersService.deleteAffiliateNetwork",
                additionalData: {
                    endpoint: `DELETE /affiliate_networks/${id}`,
                },
            },
        );
        return deleteAffiliateNetworkWithErrorHandler(id);
    }

    private async deleteAffiliateNetworkInternal(id: string) {
        return await this.keitaroService.deleteAffiliateNetwork(Number(id));
    }

    async enableCloaking(body: EnableCloakDto) {
        const enableCloakingWithErrorHandler = wrapWithErrorHandler(
            this.enableCloakingInternal.bind(this),
            {
                functionName: "OffersService.enableCloaking",
                additionalData: {
                    endpoint: "POST /offers/cloak/enable",
                    body,
                },
            },
        );

        return enableCloakingWithErrorHandler(body);
    }

    private async enableCloakingInternal(body: EnableCloakDto) {
        const { offerId, enableCloaking } = body;

        const offer = await this.keitaroService.getOfferById(offerId);

        if (!offer) {
            throw new BadRequestException(`Offer with ID ${offerId} not found`);
        }

        const updateData = {
            cloaking_enabled: enableCloaking,
        };

        const result = await this.keitaroService.updateOffer(
            offerId,
            updateData,
        );

        return {
            success: true,
            message: `Cloaking ${enableCloaking ? "enabled" : "disabled"} for offer ${offerId}`,
            data: result,
        };
    }

    async enableGraySection(body: EnableGraySectionDto) {
        const enableGraySectionWithErrorHandler = wrapWithErrorHandler(
            this.enableGraySectionInternal.bind(this),
            {
                functionName: "OffersService.enableGraySection",
                additionalData: {
                    endpoint: "POST /offers/gray-section/enable",
                    body,
                },
            },
        );

        return enableGraySectionWithErrorHandler(body);
    }

    private async enableGraySectionInternal(body: EnableGraySectionDto) {
        const { offerId, enableGraySection } = body;

        const offer = await this.keitaroService.getOfferById(offerId);

        if (!offer) {
            throw new BadRequestException(`Offer with ID ${offerId} not found`);
        }

        const updateData = {
            gray_section_enabled: enableGraySection,
        };

        const result = await this.keitaroService.updateOffer(
            offerId,
            updateData,
        );

        return {
            success: true,
            message: `Gray section ${enableGraySection ? "enabled" : "disabled"} for offer ${offerId}`,
            data: result,
        };
    }

    private buildOfferParams(customParams: any) {
        return {
            name: customParams.name,
            group_id: customParams.group_id || 20,
            offer_type: "external",
            action_type: "http",
            action_payload: customParams.action_payload,
            affiliate_network_id: customParams.affiliate_network_id,
            payout_value: customParams.payout_value || 0,
            payout_currency: customParams.payout_currency || "USD",
            payout_type: "CPA",
            state: "active",
            payout_auto:
                customParams.payout_auto !== undefined
                    ? customParams.payout_auto
                    : false,
            payout_upsell: false,
            country: customParams.country || [],
            notes: customParams.notes || "",
            archive: {},
            conversion_cap_enabled: false,
            daily_cap: 0,
            conversion_timezone: "Europe/Kyiv",
            alternative_offer_id: 0,
            action_options: customParams.action_options || [],
            values: customParams.values || "",
        };
    }

    private buildStreamData(campaignId: number, offerId: number) {
        return {
            type: "regular",
            name: "Flow 2",
            campaign_id: campaignId,
            position: 1,
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
            filters: [],
            triggers: [],
            landings: [],
            offers: [
                {
                    offer_id: offerId,
                    state: "active",
                    share: 100,
                },
            ],
        };
    }
}
