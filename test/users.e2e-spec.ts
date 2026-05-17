import { ContactType } from '@prisma/client';
import request from 'supertest';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';
import { TEST_PNG_BUFFER } from './helpers/test-image';

describe('Users (e2e)', () => {
    registerE2eHooks();

    it('returns participating events and matches in GET /users/me', async () => {
        const { app, login, seedUsers, createEvent, registerForEvent } =
            getE2eFixture();
        const { userB } = await seedUsers();
        const organizerToken = await login('organizer@example.com');
        const tokenA = await login('user-a@example.com');
        const tokenB = await login('user-b@example.com');
        const event = await createEvent(organizerToken);

        await registerForEvent(tokenA, event.id);
        await registerForEvent(tokenB, event.id);

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests/instant`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(201);

        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.events).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id: event.id,
                            title: 'Hackathon Meetup',
                        }),
                    ]),
                );
                expect(response.body.matches).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            eventId: event.id,
                            eventTitle: 'Hackathon Meetup',
                            user: expect.objectContaining({ id: userB.id }),
                        }),
                    ]),
                );
            });
    });

    it('updates profile via PUT /users/me', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

        await request(app.getHttpServer())
            .put('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .send({ fullName: 'Updated User A' })
            .expect(200)
            .expect((response) => {
                expect(response.body).toEqual(
                    expect.objectContaining({
                        email: 'user-a@example.com',
                        fullName: 'Updated User A',
                    }),
                );
            });

        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.fullName).toBe('Updated User A');
            });
    });

    it('manages profile contacts', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

        await request(app.getHttpServer())
            .put('/v1/users/me/contacts')
            .set('Authorization', `Bearer ${token}`)
            .send({
                contacts: [
                    { type: ContactType.TELEGRAM, value: '@user_a' },
                    { type: ContactType.EMAIL, value: 'user-a@example.com' },
                ],
            })
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(2);
            });

        await request(app.getHttpServer())
            .get('/v1/users/me/contacts')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            type: ContactType.TELEGRAM,
                            value: '@user_a',
                        }),
                    ]),
                );
            });

        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toEqual(
                    expect.objectContaining({
                        email: 'user-a@example.com',
                        contacts: expect.arrayContaining([
                            expect.objectContaining({
                                type: ContactType.TELEGRAM,
                            }),
                        ]),
                    }),
                );
            });
    });

    it('uploads avatar and replaces previous image', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

        await request(app.getHttpServer())
            .post('/v1/users/me/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', TEST_PNG_BUFFER, {
                filename: 'avatar.png',
                contentType: 'image/png',
            })
            .expect(201)
            .expect((response) => {
                expect(response.body.avatarUrl).toMatch(/^https:\/\//);
            });

        await request(app.getHttpServer())
            .post('/v1/users/me/avatar')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', TEST_PNG_BUFFER, {
                filename: 'avatar-2.png',
                contentType: 'image/png',
            })
            .expect(201);

        await request(app.getHttpServer())
            .get('/v1/users/me')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.avatarImage).toEqual(
                    expect.objectContaining({
                        url: expect.stringMatching(/^https:\/\//),
                    }),
                );
            });
    });

    it('returns 400 when avatar file is missing', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

        await request(app.getHttpServer())
            .post('/v1/users/me/avatar')
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });
});
