import { INestApplication } from '@nestjs/common';
import { User } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createE2eApp } from './create-e2e-app';
import { truncateDatabase } from './database';
import { createUser, DEFAULT_PASSWORD } from './factories';

export type E2eFixture = {
    app: INestApplication;
    prisma: PrismaService;
    login: (email: string) => Promise<string>;
    createEvent: (
        token: string,
        data?: {
            title?: string;
            date?: string;
            description?: string;
            tags?: string[];
            isPrivate?: boolean;
        },
    ) => Promise<{ id: string; slug: string }>;
    registerForEvent: (token: string, eventId: string) => Promise<void>;
    seedUsers: () => Promise<{
        organizer: User;
        userA: User;
        userB: User;
    }>;
};

export async function createE2eFixture(): Promise<E2eFixture> {
    const app = await createE2eApp();
    const prisma = app.get(PrismaService);

    const login = async (email: string): Promise<string> => {
        const response = await request(app.getHttpServer())
            .post('/v1/auth/login')
            .send({ email, password: DEFAULT_PASSWORD })
            .expect(200);

        return response.body.accessToken as string;
    };

    const createEvent = async (
        token: string,
        data: {
            title?: string;
            date?: string;
            description?: string;
            tags?: string[];
            isPrivate?: boolean;
        } = {},
    ) => {
        const response = await request(app.getHttpServer())
            .post('/v1/events')
            .set('Authorization', `Bearer ${token}`)
            .send({
                title: data.title ?? 'Hackathon Meetup',
                date: data.date ?? '2026-06-15T10:00:00.000Z',
                description: data.description ?? 'Networking for developers',
                tags: data.tags ?? ['backend'],
                isPrivate: data.isPrivate ?? false,
            })
            .expect(201);

        return {
            id: response.body.id as string,
            slug: response.body.slug as string,
        };
    };

    const registerForEvent = async (
        token: string,
        eventId: string,
    ): Promise<void> => {
        await request(app.getHttpServer())
            .post(`/v1/events/${eventId}/register`)
            .set('Authorization', `Bearer ${token}`)
            .expect(201);
    };

    const seedUsers = async () => {
        const organizer = await createUser(prisma, {
            email: 'organizer@example.com',
            fullName: 'Organizer',
        });
        const userA = await createUser(prisma, {
            email: 'user-a@example.com',
            fullName: 'User A',
        });
        const userB = await createUser(prisma, {
            email: 'user-b@example.com',
            fullName: 'User B',
        });

        return { organizer, userA, userB };
    };

    return {
        app,
        prisma,
        login,
        createEvent,
        registerForEvent,
        seedUsers,
    };
}

export async function destroyE2eFixture(fixture: E2eFixture): Promise<void> {
    await fixture.app.close();
}

export async function resetE2eDatabase(prisma: PrismaService): Promise<void> {
    await truncateDatabase(prisma);
}
