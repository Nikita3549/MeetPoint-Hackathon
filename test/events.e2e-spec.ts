import request from 'supertest';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';

describe('Events (e2e)', () => {
    registerE2eHooks();

    it('organizer creates event and participant registers', async () => {
        const { app, login, seedUsers, createEvent, registerForEvent } =
            getE2eFixture();
        await seedUsers();

        const organizerToken = await login('organizer@example.com');
        const participantToken = await login('user-a@example.com');

        const event = await createEvent(organizerToken, {
            title: 'Hackathon Meetup',
            tags: ['backend', 'devops'],
        });

        await request(app.getHttpServer())
            .get('/v1/events')
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].id).toBe(event.id);
            });

        await registerForEvent(participantToken, event.id);

        await request(app.getHttpServer())
            .get(`/v1/events/slug/${event.slug}`)
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.id).toBe(event.id);
            });

        await request(app.getHttpServer())
            .post(`/v1/events/slug/${event.slug}/register`)
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(201);

        await request(app.getHttpServer())
            .get('/v1/users/me/events')
            .set('Authorization', `Bearer ${participantToken}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].id).toBe(event.id);
            });
    });

    it('organizer updates event, lists participants and stats', async () => {
        const { app, login, seedUsers, createEvent, registerForEvent } =
            getE2eFixture();
        const { userA, userB } = await seedUsers();

        const organizerToken = await login('organizer@example.com');
        const tokenA = await login('user-a@example.com');
        const tokenB = await login('user-b@example.com');

        const event = await createEvent(organizerToken);
        await registerForEvent(tokenA, event.id);
        await registerForEvent(tokenB, event.id);

        await request(app.getHttpServer())
            .put('/v1/users/me/tags')
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ tags: ['backend', 'ai'] })
            .expect(200);

        await request(app.getHttpServer())
            .put(`/v1/events/${event.id}`)
            .set('Authorization', `Bearer ${organizerToken}`)
            .send({
                title: 'Updated Meetup',
                tags: ['backend', 'ai'],
            })
            .expect(200)
            .expect((response) => {
                expect(response.body.title).toBe('Updated Meetup');
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body.title).toBe('Updated Meetup');
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/participants`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].userId).toBe(userB.id);
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/participants`)
            .set('Authorization', `Bearer ${tokenA}`)
            .query({ tags: 'backend' })
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/stats`)
            .set('Authorization', `Bearer ${organizerToken}`)
            .expect(200)
            .expect((response) => {
                expect(
                    response.body.participantsRegistered,
                ).toBeGreaterThanOrEqual(2);
            });
    });

    it('returns 400 for invalid event slug', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

        await request(app.getHttpServer())
            .get('/v1/events/slug/invalid slug!')
            .set('Authorization', `Bearer ${token}`)
            .expect(400);
    });

    it('non-organizer cannot create event', async () => {
        const { app, login, seedUsers } = getE2eFixture();
        await seedUsers();

        const token = await login('user-a@example.com');

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
