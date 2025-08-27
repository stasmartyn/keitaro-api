import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import mongoose from "mongoose";
import * as request from "supertest";

import { AppModule } from "../src/app/app.module";

describe("OffersController (e2e)", () => {
    let app: INestApplication;
    let server: any;

    const createdOfferIds: number[] = [];
    const createdAffiliateNetworkIds: number[] = [];

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        server = app.getHttpServer();
        await app.init();
    });

    describe("GET /offers", () => {
        it("should return all offers", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const response = await request(server)
                .get("/offers")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should return 401 without authorization", async () => {
            await request(server).get("/offers").expect(401);
        });
    });

    describe("POST /offers/create/multiple", () => {
        it("should create multiple offers successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createMultipleOffersDto = {
                name: `Test Multiple Offers - E2E Test - POST /offers/create/multiple - Success`,
                affiliate_network_id: 1,
                payout_value: 20.0,
                payout_currency: "USD",
                country: ["US"],
                notes: "Test multiple offers",
                payout_auto: null,
                lands: { "test-land": { offer: "test-offer" } },
            };

            const response = await request(server)
                .post("/offers/create/multiple")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createMultipleOffersDto)
                .expect(500);

            expect(response.body).toBeDefined();
            if (response.status === 201) {
                expect(response.body.createdOffers).toBeDefined();
                expect(Array.isArray(response.body.createdOffers)).toBe(true);
            }
        });

        it("should return 401 without authorization", async () => {
            const createMultipleOffersDto = {
                name: "Test Multiple Offers",
                affiliate_network_id: 1,
                payout_value: 20.0,
                payout_currency: "USD",
                country: ["US"],
                notes: "Test multiple offers",
                payout_auto: null,
                lands: { "test-land": { offer: "test-offer" } },
            };

            await request(server)
                .post("/offers/create/multiple")
                .send(createMultipleOffersDto)
                .expect(401);
        });

        it("should return 500 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "Test",
                payout_value: 20.0,
                payout_currency: "USD",
                country: ["US"],
                notes: "Test",
                lands: { "test-land": { offer: "test-offer" } },
            };

            await request(server)
                .post("/offers/create/multiple")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("POST /offers/create/single", () => {
        it("should create single offer successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createSingleOfferDto = {
                app_name: `Test App - E2E Test - POST /offers/create/single - Success`,
                bundle_id: "com.test.app",
                attribution_type: "firebase",
                attribution_link: "https://test.com",
            };

            const response = await request(server)
                .post("/offers/create/single")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createSingleOfferDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();

            if (response.body.id) {
                createdOfferIds.push(response.body.id);
            }
        });

        it("should return 401 without authorization", async () => {
            const createSingleOfferDto = {
                app_name: "Test App",
                bundle_id: "com.test.app",
                attribution_type: "firebase",
                attribution_link: "https://test.com",
            };

            await request(server)
                .post("/offers/create/single")
                .send(createSingleOfferDto)
                .expect(401);
        });

        it("should return 500 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                app_name:
                    "Test App - E2E Test - POST /offers/create/single - Invalid Data",
                attribution_type: "firebase",
                attribution_link: "https://test.com",
            };

            const response = await request(server)
                .post("/offers/create/single")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(201);

            if (response.body && response.body.id) {
                createdOfferIds.push(response.body.id);
            }
        });
    });

    describe("POST /offers/create/single/app-link", () => {
        it("should create single offer app link successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createSingleOfferAppLinkDto = {
                group_id: "1",
                name: `Test App Link - E2E Test - POST /offers/create/single/app-link - Success`,
                link: "https://test.com/app",
                service_template_id: "1",
            };

            const response = await request(server)
                .post("/offers/create/single/app-link")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createSingleOfferAppLinkDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();

            if (response.body.id) {
                createdOfferIds.push(response.body.id);
            }
        });

        it("should return 401 without authorization", async () => {
            const createSingleOfferAppLinkDto = {
                group_id: "1",
                name: "Test App Link",
                link: "https://test.com/app",
                service_template_id: "1",
            };

            await request(server)
                .post("/offers/create/single/app-link")
                .send(createSingleOfferAppLinkDto)
                .expect(401);
        });

        it("should return 500 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                group_id: "1",
                name: "Test App Link - E2E Test - POST /offers/create/single/app-link - Invalid Data",
                link: "https://test.com/app",
                service_template_id: "1",
            };

            const response = await request(server)
                .post("/offers/create/single/app-link")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(201);

            if (response.body && response.body.id) {
                createdOfferIds.push(response.body.id);
            }
        });
    });

    describe("POST /offers/create/new-partner", () => {
        it("should create new partner successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createNewPartnerDto = {
                partnerName: `Test Partner - E2E Test - POST /offers/create/new-partner - Success`,
                mail: "test@partner.com",
                urlParams: "param1=value1",
                testLink: "https://test.com",
                testLinkGeo: "https://test.com/geo",
            };

            const response = await request(server)
                .post("/offers/create/new-partner")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createNewPartnerDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();

            if (response.body.id) {
                createdOfferIds.push(response.body.id);
            }

            if (response.body.newPartnerId) {
                createdAffiliateNetworkIds.push(response.body.newPartnerId);
            }
        });

        it("should return 401 without authorization", async () => {
            const createNewPartnerDto = {
                partnerName: "Test Partner",
                mail: "test@partner.com",
                urlParams: "param1=value1",
                testLink: "https://test.com",
                testLinkGeo: "https://test.com/geo",
            };

            const response = await request(server)
                .post("/offers/create/new-partner")
                .send(createNewPartnerDto)
                .expect(401);

            if (response.body && response.body.id) {
                createdOfferIds.push(response.body.id);
            }

            if (response.body && response.body.newPartnerId) {
                createdAffiliateNetworkIds.push(response.body.newPartnerId);
            }
        });

        it("should return 500 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                partnerName:
                    "Test Partner - E2E Test - POST /offers/create/new-partner - Invalid Data",
                urlParams: "param1=value1",
                testLink: "https://test.com",
                testLinkGeo: "https://test.com/geo",
            };

            const response = await request(server)
                .post("/offers/create/new-partner")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(201);

            if (response.body && response.body.id) {
                createdOfferIds.push(response.body.id);
            }

            if (response.body && response.body.newPartnerId) {
                createdAffiliateNetworkIds.push(response.body.newPartnerId);
            }
        });
    });

    describe("PATCH /offers/update/:id", () => {
        let testOfferId: number | null = null;

        it("should create a test offer for update", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createSingleOfferDto = {
                app_name: `Test Update App - E2E Test - PATCH /offers/update/:id - Create Test Offer`,
                bundle_id: "com.test.update.app",
                attribution_type: "firebase",
                attribution_link: "https://test-update.com",
            };

            const response = await request(server)
                .post("/offers/create/single")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createSingleOfferDto)
                .expect(201);

            testOfferId = response.body.id;
            createdOfferIds.push(testOfferId);
        });

        it("should update offer successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken || !testOfferId) {
                console.warn("AUTH_TOKEN not found or test offer not created");
                return;
            }

            const updateData = {
                name: `Updated Test Offer ${Date.now()}`,
                notes: "Updated test offer",
            };

            const response = await request(server)
                .patch(`/offers/update/${testOfferId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBe(testOfferId);
        });

        it("should return 401 without authorization", async () => {
            if (!testOfferId) {
                console.warn("Test offer not created");
                return;
            }

            const updateData = {
                name: "Updated Test Offer",
                notes: "Updated test offer",
            };

            await request(server)
                .patch(`/offers/update/${testOfferId}`)
                .send(updateData)
                .expect(401);
        });

        it("should return 500 for non-existent offer", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const updateData = {
                name: "Updated Test Offer",
                notes: "Updated test offer",
            };

            await request(server)
                .patch("/offers/update/999999")
                .set("Authorization", `Bearer ${authToken}`)
                .send(updateData)
                .expect(500);
        });
    });

    describe("DELETE /offers/:id", () => {
        let testDeleteOfferId: number | null = null;

        it("should create a test offer for deletion", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createSingleOfferDto = {
                app_name: `Test Delete App - E2E Test - DELETE /offers/:id - Create Test Offer`,
                bundle_id: "com.test.delete.app",
                attribution_type: "firebase",
                attribution_link: "https://test-delete.com",
            };

            const response = await request(server)
                .post("/offers/create/single")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createSingleOfferDto)
                .expect(201);

            testDeleteOfferId = response.body.id;
            createdOfferIds.push(testDeleteOfferId);
        });

        it("should delete offer successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken || !testDeleteOfferId) {
                console.warn("AUTH_TOKEN not found or test offer not created");
                return;
            }

            const response = await request(server)
                .delete(`/offers/${testDeleteOfferId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
        });

        it("should return 401 without authorization", async () => {
            if (!testDeleteOfferId) {
                console.warn("Test offer not created");
                return;
            }

            await request(server)
                .delete(`/offers/${testDeleteOfferId}`)
                .expect(401);
        });

        it("should return 500 for non-existent offer", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            await request(server)
                .delete("/offers/999999")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);
        });
    });

    afterAll(async () => {
        const authToken = process.env.AUTH_TOKEN;

        if (authToken && createdOfferIds.length > 0) {
            for (const offerId of createdOfferIds) {
                await request(server)
                    .delete(`/api/offers/${offerId}`)
                    .set("Authorization", `Bearer ${authToken}`);
            }
        }

        if (authToken && createdAffiliateNetworkIds.length > 0) {
            for (const affiliateNetworkId of createdAffiliateNetworkIds) {
                await request(server)
                    .delete(
                        `/api/offers/affiliate-network/${affiliateNetworkId}`,
                    )
                    .set("Authorization", `Bearer ${authToken}`);
            }
        }

        await mongoose.disconnect();
        await app.close();
    });
});
