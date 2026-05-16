import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { createE2eApp } from './helpers/create-e2e-app';
import { truncateDatabase } from './helpers/database';
import { createUser, DEFAULT_PASSWORD } from './helpers/factories';

describe('Auth (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaClient;

    beforeAll(async () => {
        app = await createE2eApp();
        prisma = new PrismaClient();
        await prisma.$connect();
    });

    beforeEach(async () => {
        await truncateDatabase(prisma);
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    it('POST /v1/auth/login returns access token for valid credentials', async () => {
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Test User',
        });

        const response = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({
                email: 'user@example.com',
                password: DEFAULT_PASSWORD,
            })
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                accessToken: expect.any(String),
            }),
        );
    });

    it('POST /v1/auth/login returns 401 for invalid password', async () => {
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Test User',
        });

        await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({
                email: 'user@example.com',
                password: 'wrong-password',
            })
            .expect(401);
    });

    it('GET /v1/users/me requires authentication', async () => {
        await request(app.getHttpServer()).get('/v1/users/me').expect(401);
    });

    it('GET /v1/users/me returns profile with valid token', async () => {
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Test User',
        });

        const login = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({
                email: 'user@example.com',
                password: DEFAULT_PASSWORD,
            })
            .expect(200);

        const response = await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${login.body.accessToken}`)
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                email: 'user@example.com',
                fullName: 'Test User',
            }),
        );
    });
});
