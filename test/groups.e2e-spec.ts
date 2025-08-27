import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app/app.module";
import { Server } from "http";
import mongoose from "mongoose";

describe("GroupsController (e2e)", () => {
    let app: INestApplication;
    let server: Server;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        server = app.getHttpServer();
        await app.init();
    });

    describe("GET /groups", () => {
        it("should return groups successfully with valid token", async () => {
            // Arrange
            const type = "android";
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            // Act
            const response = await request(server)
                .get(`/groups?type=${type}`)
                .set("Authorization", `Bearer ${authToken}`);

            // Assert
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should return empty array when no groups found", async () => {
            // Arrange
            const type = "nonexistent";
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            // Act
            const response = await request(server)
                .get(`/groups?type=${type}`)
                .set("Authorization", `Bearer ${authToken}`);

            // Assert
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should handle empty type parameter", async () => {
            // Arrange
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            // Act
            const response = await request(server)
                .get("/groups?type=")
                .set("Authorization", `Bearer ${authToken}`);

            // Assert
            expect(response.status).toEqual(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it("should handle null type parameter", async () => {
            // Arrange
            const authToken = process.env.AUTH_TOKEN;

            if (!authToken) {
                console.warn("AUTH_TOKEN not found in environment variables");
                return;
            }

            // Act
            const response = await request(server)
                .get("/groups")
                .set("Authorization", `Bearer ${authToken}`);

            // Assert
            expect(response.status).toEqual(500);
            expect(response.body.message).toContain(
                "Error in GroupsService.getGroups",
            );
        });
    });

    describe("Authorization", () => {
        it("should deny access without authorization header", async () => {
            // Act
            const response = await request(server).get("/groups?type=android");

            // Assert
            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access with invalid token", async () => {
            // Act
            const response = await request(server)
                .get("/groups?type=android")
                .set("Authorization", "Bearer invalid-token");

            // Assert
            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access with malformed authorization header", async () => {
            // Act
            const response = await request(server)
                .get("/groups?type=android")
                .set("Authorization", "invalid-token"); // без "Bearer "

            // Assert
            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });

        it("should deny access with empty token", async () => {
            // Act
            const response = await request(server)
                .get("/groups?type=android")
                .set("Authorization", "Bearer "); // порожній токен

            // Assert
            expect(response.status).toEqual(401);
            expect(response.body.message).toBeDefined();
        });
    });

    afterAll(async () => {
        if (app) {
            mongoose.disconnect();
            await app.close();
        }
    });
});
