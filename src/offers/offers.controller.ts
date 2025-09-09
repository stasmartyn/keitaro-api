import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
} from "@nestjs/common";

import { OffersService } from "./offers.service";
import {
    CreateMultipleOffersDto,
    CreateNewPartnerDto,
    CreateSingleOfferAppLinkDto,
    CreateSingleOfferDto,
} from "./dto/create-offers.dto";
import { CreateRentOfferDto } from "./dto/create-rent-offer.dto";

@Controller("offers")
export class OffersController {
    constructor(private readonly offersService: OffersService) {}

    @Get("")
    async getOffers() {
        return this.offersService.getOffers();
    }

    @Post("create/multiple")
    async createMultipleOffers(@Body() body: CreateMultipleOffersDto) {
        return this.offersService.createOffer(body);
    }

    @Post("create/single")
    async createSingleOffer(@Body() body: CreateSingleOfferDto) {
        return this.offersService.createSingleOffer(body);
    }

    @Post("create/rent-offer")
    async createRentOffer(@Body() body: CreateRentOfferDto) {
        return this.offersService.createRentOffer(body);
    }

    @Post("create/single/app-link")
    async createSingleOfferAppLink(@Body() body: CreateSingleOfferAppLinkDto) {
        return this.offersService.createSingleOfferAppLink(body);
    }

    @Post("create/new-partner")
    async createNewPartner(@Body() body: CreateNewPartnerDto) {
        return this.offersService.createNewPartner(body);
    }

    @Patch("update/:id")
    async updateOffer(@Param("id") id: string, @Body() body: any) {
        return this.offersService.updateOffer(id, body);
    }

    @Delete(":id")
    async deleteOffer(@Param("id") id: string) {
        return this.offersService.deleteOffer(id);
    }

    @Delete("affiliate-network/:id")
    async deleteAffiliateNetwork(@Param("id") id: string) {
        return this.offersService.deleteAffiliateNetwork(id);
    }
}
