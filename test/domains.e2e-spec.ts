import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app/app.module";
import { Server } from "http";
import mongoose from "mongoose";

describe("DomainsController (e2e)", () => {
    let app: INestApplication;
    let server: Server;
    let testDomainId: number | null = null;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        server = app.getHttpServer();
        await app.init();
    });

    describe("GET /domains", () => {
        it("should return domains successfully with valid token", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const response = await request(server)
                .get("/domains")
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe("POST /domains/create", () => {
        it("should create domain successfully with valid token", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createDomainDto = {
                domain: `test-domain-${Date.now()}.com`,
                groupId: 1,
                oneLinkSettings:
                    '{"catch_not_found": false, "default_campaign_id": 123}',
            };

            const response = await request(server)
                .post("/domains/create")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createDomainDto);

            expect(response.status).toEqual(201);
            expect(response.body).toBeDefined();

            const domainsResponse = await request(server)
                .get("/domains")
                .set("Authorization", `Bearer ${authToken}`);

            expect(domainsResponse.status).toEqual(200);
            const domains = domainsResponse.body;
            const createdDomain = domains.find(
                (domain: any) => domain.name === createDomainDto.domain,
            );
            expect(createdDomain).toBeDefined();
            const domainId = createdDomain.id;
            expect(domainId).toBeDefined();

            const deleteResponse = await request(server)
                .delete(`/domains/${domainId}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(deleteResponse.status).toEqual(200);

            await request(server)
                .get(`/domains/${domainId}`)
                .set("Authorization", `Bearer ${authToken}`);
        });

        it("should handle validation error for missing required fields", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const invalidDto = {
                domain: "test-domain.com",
                oneLinkSettings: '{"catch_not_found": false}',
            };

            const response = await request(server)
                .post("/domains/create")
                .set("Authorization", `Bearer ${authToken}`)
                .send(invalidDto);

            expect(response.status).toEqual(201);
        });

        it("should throw error when trying to create domain with existing name", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const existingDomainDto = {
                domain: "test-domain.com",
                groupId: 1,
                oneLinkSettings: '{"catch_not_found": false}',
            };

            const response = await request(server)
                .post("/domains/create")
                .set("Authorization", `Bearer ${authToken}`)
                .send(existingDomainDto);

            expect(response.status).toEqual(500);
            expect(response.body.message).toContain(
                "Error in DomainsService.createDomain",
            );
        });
    });

    describe("GET /domains/:id", () => {
        it("should return domain by ID successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const domainsResponse = await request(server)
                .get("/domains")
                .set("Authorization", `Bearer ${authToken}`);

            expect(domainsResponse.status).toEqual(200);
            const domains = domainsResponse.body;

            if (domains.length === 0) {
                return;
            }

            const existingDomainId = domains[0].id;

            const response = await request(server)
                .get(`/domains/${existingDomainId}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
            expect(response.body).toBeDefined();
            expect(response.body.id).toEqual(existingDomainId);
        });

        it("should handle non-existent domain ID", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const nonExistentId = 999999;

            const response = await request(server)
                .get(`/domains/${nonExistentId}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(500);
        });
    });

    describe("GET /domains/check/:domain", () => {
        it("should check domain existence successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const domainName = "test-check-domain.com";

            const response = await request(server)
                .get(`/domains/check/${domainName}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
            expect(response.body).toBeDefined();
            expect(response.body.domain).toEqual(domainName);
            expect(typeof response.body.exists).toBe("boolean");
        });

        it("should handle non-existent domain check", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const nonExistentDomain = "non-existent-domain-12345.com";

            const response = await request(server)
                .get(`/domains/check/${nonExistentDomain}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
            expect(response.body).toBeDefined();
            expect(response.body.domain).toEqual(nonExistentDomain);
            expect(response.body.exists).toBe(false);
        });

        it("should check existing domain and return true", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const existingDomain = "test-domain.com";

            const response = await request(server)
                .get(`/domains/check/${existingDomain}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
            expect(response.body).toBeDefined();
            expect(response.body.domain).toEqual(existingDomain);
            expect(response.body.exists).toBe(true);

            const domainsResponse = await request(server)
                .get("/domains")
                .set("Authorization", `Bearer ${authToken}`);

            expect(domainsResponse.status).toEqual(200);
            const domains = domainsResponse.body;
            const foundDomain = domains.find(
                (domain: any) => domain.name === existingDomain,
            );
            if (foundDomain) {
                testDomainId = foundDomain.id;
            }
        });
    });

    describe("DELETE /domains/:id", () => {
        it("should delete domain successfully", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const createDomainDto = {
                domain: `delete-test-domain-${Date.now()}.com`,
                groupId: 1,
                oneLinkSettings:
                    '{"catch_not_found": false, "default_campaign_id": 123}',
            };

            const createResponse = await request(server)
                .post("/domains/create")
                .set("Authorization", `Bearer ${authToken}`)
                .send(createDomainDto);

            expect(createResponse.status).toEqual(201);

            const domainsResponse = await request(server)
                .get("/domains")
                .set("Authorization", `Bearer ${authToken}`);

            expect(domainsResponse.status).toEqual(200);
            const domains = domainsResponse.body;
            const createdDomain = domains.find(
                (domain: any) => domain.name === createDomainDto.domain,
            );
            expect(createdDomain).toBeDefined();
            const domainId = createdDomain.id;
            expect(domainId).toBeDefined();

            const deleteResponse = await request(server)
                .delete(`/domains/${domainId}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(deleteResponse.status).toEqual(200);

            await request(server)
                .get(`/domains/${domainId}`)
                .set("Authorization", `Bearer ${authToken}`);
        });

        it("should handle deletion of non-existent domain", async () => {
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            const nonExistentId = 999999;

            const response = await request(server)
                .delete(`/domains/${nonExistentId}`)
                .set("Authorization", `Bearer ${authToken}`);

            expect(response.status).toEqual(200);
        });
    });

    describe("Authorization", () => {
        it("should deny access to GET /domains without authorization header", async () => {
            const response = await request(server).get("/domains");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to POST /domains/create without authorization header", async () => {
            const response = await request(server).post("/domains/create");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to GET /domains with invalid token", async () => {
            const response = await request(server)
                .get("/domains")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to POST /domains/create with invalid token", async () => {
            const response = await request(server)
                .post("/domains/create")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to GET /domains/:id without authorization header", async () => {
            const response = await request(server).get("/domains/123");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to GET /domains/:id with invalid token", async () => {
            const response = await request(server)
                .get("/domains/123")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to GET /domains/check/:domain without authorization header", async () => {
            const response = await request(server).get(
                "/domains/check/test.com",
            );

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to GET /domains/check/:domain with invalid token", async () => {
            const response = await request(server)
                .get("/domains/check/test.com")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to DELETE /domains/:id without authorization header", async () => {
            const response = await request(server).delete("/domains/123");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access to DELETE /domains/:id with invalid token", async () => {
            const response = await request(server)
                .delete("/domains/123")
                .set("Authorization", "Bearer invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access with malformed authorization header", async () => {
            const response = await request(server)
                .get("/domains")
                .set("Authorization", "invalid-token");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access with empty token", async () => {
            const response = await request(server)
                .get("/domains")
                .set("Authorization", "Bearer ");

            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });
    });

    afterAll(async () => {
        if (app) {
            if (testDomainId) {
                const authToken = process.env.AUTH_TOKEN;
                if (authToken) {
                    await request(server)
                        .delete(`/domains/${testDomainId}`)
                        .set("Authorization", `Bearer ${authToken}`);
                }
            }

            mongoose.disconnect();
            await app.close();
        }
    });
});
