import request from 'supertest';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';
import { TEST_PNG_BUFFER } from './helpers/test-image';

describe('Images (e2e)', () => {
    registerE2eHooks();

    it('uploads event cover image', async () => {
        const { app, login, seedUsers, createEvent } = getE2eFixture();
        await seedUsers();

        const organizerToken = await login('organizer@example.com');
        const event = await createEvent(organizerToken);

        await request(app.getHttpServer())
            .post(`/v1/events/${event.id}/image`)
            .set('Authorization', `Bearer ${organizerToken}`)
            .attach('file', TEST_PNG_BUFFER, {
                filename: 'cover.png',
                contentType: 'image/png',
            })
            .expect(201)
            .expect((response) => {
                expect(response.body.imageUrl).toMatch(/^https:\/\//);
            });
    });
});
