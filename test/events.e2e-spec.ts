import { INestApplication } from '@nestjs/common';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { createE2eApp } from './helpers/create-e2e-app';
import { truncateDatabase } from './helpers/database';
import { createUser, DEFAULT_PASSWORD } from './helpers/factories';

describe('Events (e2e)', () => {
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

    async function login(email: string): Promise<string> {
        const response = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({ email, password: DEFAULT_PASSWORD })
            .expect(200);

        return response.body.accessToken as string;
    }

    it('organizer creates event and participant registers', async () => {
        await createUser(prisma, {
            email: 'organizer@example.com',
            fullName: 'Organizer',
            role: UserRole.ORGANIZER,
        });
        await createUser(prisma, {
            email: 'participant@example.com',
            fullName: 'Participant',
        });

        const organizerToken = await login('organizer@example.com');
        const participantToken = await login('participant@example.com');

        const createResponse = await request(app.getHttpServer())
            .post('/v1/events')
            .set('Authorization', `Bearer ${organizerToken}`)
            .send({
                title: 'Hackathon Meetup',
                date: '2026-06-15T10:00:00.000Z',
                description: 'Networking for developers',
                tags: ['backend', 'devops'],
            })
            .expect(201);

        const eventId = createResponse.body.id as string;
        const eventSlug = createResponse.body.slug as string;

        expect(createResponse.body).toEqual(
            expect.objectContaining({
                title: 'Hackathon Meetup',
                slug: expect.any(String),
            }),
        );

        await request(app.getHttpServer())
            .get('/v1/events')
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].id).toBe(eventId);
            });

        await request(app.getHttpServer())
            .post(`/v1/events/${eventId}/register`)
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(201);

        await request(app.getHttpServer())
            .get(`/v1/events/slug/${eventSlug}`)
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.id).toBe(eventId);
            });

        await request(app.getHttpServer())
            .get('/v1/users/me/events')
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].id).toBe(eventId);
            });
    });

    it('non-organizer cannot create event', async () => {
        await createUser(prisma, {
            email: 'user@example.com',
            fullName: 'Regular User',
        });

        const token = await login('user@example.com');

        await request(app.getHttpServer())
            .post('/v1/events')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: 'Hackathon Meetup',
                date: '2026-06-15T10:00:00.000Z',
                description: 'Networking for developers',
                tags: ['backend'],
            })
            .expect(403);
    });
});
