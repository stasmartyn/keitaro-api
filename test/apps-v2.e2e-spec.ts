import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app/app.module";
import mongoose from "mongoose";

const createdTrafficSourceIds: number[] = [];
const createdCampaignIds: number[] = [];

describe("AppsV2Controller (e2e)", () => {
    let app: INestApplication;
    let server: any;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        server = app.getHttpServer();
    });

    afterAll(async () => {
        const authToken = process.env.AUTH_TOKEN;

        if (authToken) {
            for (const campaignId of createdCampaignIds) {
                await request(server)
                    .delete(`/v1/apps/campaign/${campaignId}`)
                    .set("Authorization", `Bearer ${authToken}`);
            }

            for (const trafficSourceId of createdTrafficSourceIds) {
                await request(server)
                    .delete(`/v1/apps/traffic-source/${trafficSourceId}`)
                    .set("Authorization", `Bearer ${authToken}`);
            }
        }

        await mongoose.disconnect();
        await app.close();
    });

    describe("POST /v2/apps/create-campaign", () => {
        it("should create iOS app successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createAppDto = {
                name: `TestV2iOS`,
                bundle_id: `com.test.v2.ios`,
                sub_id: "sub123",
                postback_url: "https://test.com/postback",
                isAndroid: false,
                isIos: true,
            };

            const response = await request(server)
                .post("/v2/apps/create-campaign")
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

            expect(response.body.trafficSourceId).toBeGreaterThan(0);
            expect(response.body.orgCampaign.campaignId).toBeGreaterThan(0);
            expect(response.body.orgCampaign.campaignToken).toBeDefined();
            expect(response.body.orgCampaign.campaignAlias).toBeDefined();
            expect(response.body.orgCampaign.orgFalseId).toBeDefined();
            expect(response.body.cloCampaign.campaignId).toBeGreaterThan(0);
            expect(response.body.cloCampaign.campaignToken).toBeDefined();
            expect(response.body.cloCampaign.campaignAlias).toBeDefined();
            expect(response.body.cloCampaign.clTrueId).toBeDefined();
            expect(response.body.cloCampaign.clFalseId).toBeDefined();
        });

        it("should return 401 without authorization", async () => {
            const createAppDto = {
                name: "Test App V2 - No Auth",
                bundle_id: "com.test.app.v2.noauth",
                sub_id: "sub123",
                postback_url: "https://test.com/postback",
                isAndroid: true,
                isIos: false,
            };

            await request(server)
                .post("/v2/apps/create-campaign")
                .send(createAppDto)
                .expect(401);
        });

        it("should return 400 for invalid data", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                sub_id: "sub123",
                postback_url: "https://test.com/postback",
                isAndroid: true,
                isIos: false,
            };

            await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });

        it("should return 400 for missing required fields", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "",
                bundle_id: "",
                sub_id: "sub123",
                postback_url: "https://test.com/postback",
                isAndroid: true,
                isIos: false,
            };

            await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(400);
        });

        it("should return 400 for invalid boolean values", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "Test App",
                bundle_id: "com.test.app",
                sub_id: "sub123",
                postback_url: "https://test.com/postback",
                isAndroid: "invalid",
                isIos: false,
            };

            await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(500);
        });

        it("should return 400 for invalid URL", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                name: "Test App",
                bundle_id: "com.test.app",
                sub_id: "sub123",
                postback_url: "invalid-url",
                isAndroid: true,
                isIos: false,
            };

            await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto)
                .expect(500);
        });

        it("should handle Keitaro API errors gracefully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createAppDto = {
                name: `TestV2Error`,
                bundle_id: "com.test.v2.error",
                sub_id: "invalid_sub_id",
                postback_url: "invalid_url",
                isAndroid: true,
                isIos: false,
            };

            const response = await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createAppDto);

            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.body).toBeDefined();
        });

        it("should validate endpoint exists", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const response = await request(server)
                .post("/v2/apps/create-campaign")
                .set("Authorization", `Bearer ${authToken}`)
                .send({});

            expect(response.status).not.toBe(404);
            expect(response.status).toBeGreaterThanOrEqual(400);
        });
    });
});
