import { UserStatus } from '@prisma/client';
import request from 'supertest';
import { createUser, DEFAULT_PASSWORD } from './helpers/factories';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';

describe('Auth (e2e)', () => {
    registerE2eHooks();

    it('POST /v1/auth/login returns access token for valid credentials', async () => {
        const { app, prisma } = getE2eFixture();
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
        const { app, prisma } = getE2eFixture();
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

    it('POST /v1/auth/login returns 401 for inactive user', async () => {
        const { app, prisma } = getE2eFixture();
        await createUser(prisma, {
            email: 'inactive@example.com',
            fullName: 'Inactive User',
            status: UserStatus.INACTIVE,
        });

        await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({
                email: 'inactive@example.com',
                password: DEFAULT_PASSWORD,
            })
            .expect(401);
    });

    it('GET /v1/users/me requires authentication', async () => {
        const { app } = getE2eFixture();

        await request(app.getHttpServer()).get('/v1/users/me').expect(401);
    });

    it('POST /v1/auth/register creates user and returns access token', async () => {
        const { app } = getE2eFixture();

        const response = await request(app.getHttpServer())
            .post('/v1/auth/register')
            .send({
                email: 'new-user@example.com',
                password: DEFAULT_PASSWORD,
            })
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                accessToken: expect.any(String),
                name: 'new-user',
                contacts: [],
            }),
        );
    });

    it('POST /v1/auth/register returns 409 for duplicate email', async () => {
        const { app, prisma } = getE2eFixture();
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Existing User',
        });

        await request(app.getHttpServer())
            .post('/v1/auth/register')
            .send({
                email: 'user@example.com',
                password: DEFAULT_PASSWORD,
            })
            .expect(409);
    });

    it('GET /v1/users/me returns profile with valid token', async () => {
        const { app, prisma, login } = getE2eFixture();
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Test User',
        });

        const token = await login('user@example.com');

        const response = await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                email: 'user@example.com',
                fullName: 'Test User',
            }),
        );
    });
});
