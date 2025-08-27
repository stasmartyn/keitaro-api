import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import mongoose from "mongoose";
import * as request from "supertest";

import { AppModule } from "../src/app/app.module";

describe("AppsController (e2e)", () => {
    let app: INestApplication;
    let server: any;

    const createdCampaignIds: number[] = [];
    const createdTrafficSourceIds: number[] = [];

    beforeAll(async () => {
        const mongoUri = process.env.MONGO_DATABASE_URI;

        try {
            await mongoose.connect(mongoUri);
            console.log("Connected to MongoDB for e2e tests");
        } catch (error) {
            console.error("Failed to connect to MongoDB:", error);
        }
    });

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        server = app.getHttpServer();
        await app.init();
    });

    describe("GET /v1/apps/all-campaigns", () => {
        it("should return all campaigns successfully with valid token", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const response = await request(server)
                .get("/v1/apps/all-campaigns")
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should return 401 without authorization", async () => {
            await request(server).get("/v1/apps/all-campaigns").expect(401);
        });

        it("should return 401 with invalid token", async () => {
            await request(server)
                .get("/v1/apps/all-campaigns")
                .set("Authorization", "Bearer invalid-token")
                .expect(401);
        });
    });

    describe("POST /v1/apps/create-campaign", () => {
        it("should create app successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createAppDto = {
                name: `Test App - E2E Test - Success`,
                bundle_id: "com.test.app.e2e",
                sub_id: "7085",
                postback_url: "https://test.com/postback",
                isAndroid: true,
                isIos: false,
            };

            const response = await request(server)
                .post("/v1/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createAppDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.trafficSourceId).toBeDefined();
            expect(response.body.orgCampaign).toBeDefined();
            expect(response.body.cloCampaign).toBeDefined();

            if (response.body.trafficSourceId) {
                createdTrafficSourceIds.push(response.body.trafficSourceId);
            }
            if (response.body.orgCampaign?.campaignId) {
                createdCampaignIds.push(response.body.orgCampaign.campaignId);
            }
            if (response.body.cloCampaign?.campaignId) {
                createdCampaignIds.push(response.body.cloCampaign.campaignId);
            }
        });

        it("should return 401 without authorization", async () => {
            const createAppDto = {
                name: "Test App",
                bundle_id: "com.test.app",
                sub_id: "7085",
                postback_url: "https://test.com/postback",
                isAndroid: true,
                isIos: false,
            };

            await request(server)
                .post("/v1/apps/create-campaign")
                .send(createAppDto)
                .expect(401);
        });

        it("should return 400 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "",
                bundle_id: "",
                // missing required fields
            };

            await request(server)
                .post("/v1/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("POST /v1/apps/copy-campaign", () => {
        it("should copy campaign successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn(
                    "AUTH_TOKEN not found or test campaign not created",
                );
                return;
            }

            const copyCampaignDto = {
                id: 4800,
                group_id: 2,
                name: `Copied Campaign ${Date.now()}`,
                sub_id: "sub123",
                change_parameters: true,
            };

            const response = await request(server)
                .post("/v1/apps/copy-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(copyCampaignDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();
            expect(response.body.name).toBe(copyCampaignDto.name);

            if (response.body.id) {
                createdCampaignIds.push(response.body.id);
            }
        });

        it("should return 401 without authorization", async () => {
            const copyCampaignDto = {
                id: 4800,
                group_id: 2,
                name: "Copied Campaign",
                sub_id: "sub123",
                change_parameters: true,
            };

            await request(server)
                .post("/v1/apps/copy-campaign")
                .send(copyCampaignDto)
                .expect(401);
        });

        it("should return 400 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                id: 0,
                group_id: 0,
                name: "",
                // missing required fields
            };

            await request(server)
                .post("/v1/apps/copy-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("POST /v1/apps/create-no-org-campaign", () => {
        it("should create no org campaign successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createNoOrgCampaignDto = {
                name: `No Org Campaign - Success`,
                bundle: "com.ball.pink.drop",
                buyerId: "7085",
            };

            const response = await request(server)
                .post("/v1/apps/create-no-org-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createNoOrgCampaignDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.trafficSourceId).toBeDefined();
            expect(response.body.noOrgCampaign).toBeDefined();
            expect(response.body.name).toBeDefined();
            expect(response.body.alias).toBeDefined();

            if (response.body.noOrgCampaign?.campaignId) {
                createdCampaignIds.push(
                    Number(response.body.noOrgCampaign.campaignId),
                );
            }
        });

        it("should return 401 without authorization", async () => {
            const createNoOrgCampaignDto = {
                name: "No Org Campaign",
                bundle: "com.ball.pink.drop",
                buyerId: "7085",
            };

            await request(server)
                .post("/v1/apps/create-no-org-campaign")
                .send(createNoOrgCampaignDto)
                .expect(401);
        });

        it("should return 400 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "",
                bundle: "",
                buyerId: "",
            };

            await request(server)
                .post("/v1/apps/create-no-org-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("POST /v1/apps/create-by-offer", () => {
        it("should create by offer successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createByOfferDto = {
                offer_id: "123",
            };

            const response = await request(server)
                .post("/v1/apps/create-by-offer")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createByOfferDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.name).toBeDefined();
            expect(response.body.alias).toBeDefined();
            expect(response.body.user_id).toBeDefined();
        });

        it("should return 401 without authorization", async () => {
            const createByOfferDto = {
                offer_id: "123",
            };

            await request(server)
                .post("/v1/apps/create-by-offer")
                .send(createByOfferDto)
                .expect(401);
        });

        it("should return 400 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                offer_id: "",
            };

            await request(server)
                .post("/v1/apps/create-by-offer")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("POST /v1/apps/create-onelink-campaign", () => {
        it("should create onelink campaign successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createOnelinkCampaignDto = {
                offer_id: "123",
                bundle_id: "com.test.onelink.app",
                app_name: `Onelink Test App - E2E Test - POST /v1/apps/create-onelink-campaign - Success`,
            };

            const response = await request(server)
                .post("/v1/apps/create-onelink-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createOnelinkCampaignDto)
                .expect(201);

            expect(response.body).toBeDefined();
            expect(response.body.id).toBeDefined();

            if (response.body.id) {
                createdCampaignIds.push(response.body.id);
            }
        });

        it("should return 401 without authorization", async () => {
            const createOnelinkCampaignDto = {
                offer_id: "123",
                bundle_id: "com.test.onelink.app",
                app_name: "Onelink Test App",
            };

            await request(server)
                .post("/v1/apps/create-onelink-campaign")
                .send(createOnelinkCampaignDto)
                .expect(401);
        });

        it("should return 400 with invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                offer_id: "",
                bundle_id: "",
                app_name: "",
            };

            await request(server)
                .post("/v1/apps/create-onelink-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });
    });

    describe("Authorization", () => {
        it("should deny access without authorization header", async () => {
            await request(server).get("/v1/apps/all-campaigns").expect(401);
        });

        it("should deny access with invalid token", async () => {
            await request(server)
                .get("/v1/apps/all-campaigns")
                .set("Authorization", "Bearer invalid-token")
                .expect(401);
        });

        it("should deny access with malformed authorization header", async () => {
            await request(server)
                .get("/v1/apps/all-campaigns")
                .set("Authorization", "invalid-token") // без "Bearer "
                .expect(401);
        });

        it("should deny access with empty token", async () => {
            await request(server)
                .get("/v1/apps/all-campaigns")
                .set("Authorization", "Bearer ") // порожній токен
                .expect(401);
        });
    });

    afterAll(async () => {
        const authToken = process.env.AUTH_TOKEN;

        if (authToken && createdCampaignIds.length > 0) {
            for (const campaignId of createdCampaignIds) {
                await request(server)
                    .delete(`/v1/apps/campaign/${campaignId}`)
                    .set("Authorization", `Bearer ${authToken}`);
            }
        }

        if (authToken && createdTrafficSourceIds.length > 0) {
            for (const trafficSourceId of createdTrafficSourceIds) {
                await request(server)
                    .delete(`/v1/apps/traffic-source/${trafficSourceId}`)
                    .set("Authorization", `Bearer ${authToken}`);
            }
        }

        await mongoose.disconnect();
        await app.close();
    });
});
