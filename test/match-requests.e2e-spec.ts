import { ContactType } from '@prisma/client';
import request from 'supertest';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';

describe('Match requests (e2e)', () => {
    registerE2eHooks();

    async function setupEventWithParticipants() {
        const ctx = getE2eFixture();
        const { userA, userB } = await ctx.seedUsers();
        const organizerToken = await ctx.login('organizer@example.com');
        const tokenA = await ctx.login('user-a@example.com');
        const tokenB = await ctx.login('user-b@example.com');
        const event = await ctx.createEvent(organizerToken);

        await ctx.registerForEvent(tokenA, event.id);
        await ctx.registerForEvent(tokenB, event.id);

        return { ...ctx, event, userA, userB, tokenA, tokenB };
    }

    it('accepts match request and returns matched contacts', async () => {
        const { app, event, userA, tokenA, tokenB } =
            await setupEventWithParticipants();

        await request(app.getHttpServer())
            .put('/v1/users/me/contacts')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                contacts: [{ type: ContactType.TELEGRAM, value: '@user_a' }],
            })
            .expect(200);

        await request(app.getHttpServer())
            .put(`/v1/events/${event.id}/participants/me/tags`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ tags: ['backend'] })
            .expect(200);

        const createResponse = await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ toUserId: userA.id })
            .expect(201);

        const requestId = createResponse.body.id as string;

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/match-requests/incoming`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].id).toBe(requestId);
                expect(response.body[0].toUser.tags).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'backend' }),
                    ]),
                );
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/match-requests/outgoing`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
            });

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests/${requestId}/accept`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(201)
            .expect((response) => {
                expect(response.body.status).toBe('ACCEPTED');
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/matches`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].user.id).toBe(userA.id);
                expect(response.body[0].user.tags).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({ name: 'backend' }),
                    ]),
                );
                expect(response.body[0].contacts).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            type: ContactType.TELEGRAM,
                            value: '@user_a',
                        }),
                    ]),
                );
            });
    });

    it('rejects match request', async () => {
        const { app, event, userB, tokenA, tokenB } =
            await setupEventWithParticipants();

        const createResponse = await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(201);

        const requestId = createResponse.body.id as string;

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests/${requestId}/reject`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(201)
            .expect((response) => {
                expect(response.body.status).toBe('REJECTED');
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/matches`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(0);
            });
    });

    it('auto-accepts when reverse request is sent', async () => {
        const { app, event, userA, userB, tokenA, tokenB } =
            await setupEventWithParticipants();

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ toUserId: userA.id })
            .expect(201)
            .expect((response) => {
                expect(response.body.status).toBe('ACCEPTED');
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/matches`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].user.id).toBe(userB.id);
            });
    });

    it('returns 409 for duplicate match request', async () => {
        const { app, event, userB, tokenA } =
            await setupEventWithParticipants();

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(201);

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(409);
    });

    it('returns 400 when sending request to yourself', async () => {
        const { app, event, userA, tokenA } =
            await setupEventWithParticipants();

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userA.id })
            .expect(400);
    });

    it('matches instantly without confirmation via QR scan flow', async () => {
        const { app, event, userA, userB, tokenA, tokenB } =
            await setupEventWithParticipants();

        await request(app.getHttpServer())
            .put('/v1/users/me/contacts')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({
                contacts: [{ type: ContactType.TELEGRAM, value: '@user_a' }],
            })
            .expect(200);

        const matchResponse = await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests/instant`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(201);

        expect(matchResponse.body.status).toBe('ACCEPTED');
        expect(matchResponse.body.fromUser.id).toBe(userA.id);
        expect(matchResponse.body.toUser.id).toBe(userB.id);

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/match-requests/incoming`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(0);
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/matches`)
            .set('Authorization', `Bearer ${tokenA}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].user.id).toBe(userB.id);
            });

        await request(app.getHttpServer())
            .get(`/v1/events/${event.id}/matches`)
            .set('Authorization', `Bearer ${tokenB}`)
            .expect(200)
            .expect((response) => {
                expect(response.body).toHaveLength(1);
                expect(response.body[0].user.id).toBe(userA.id);
                expect(response.body[0].contacts).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            type: ContactType.TELEGRAM,
                            value: '@user_a',
                        }),
                    ]),
                );
            });

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/match-requests/instant`)
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ toUserId: userB.id })
            .expect(409);
    });
});
