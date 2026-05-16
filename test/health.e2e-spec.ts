import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2eApp } from './helpers/create-e2e-app';

describe('Health (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createE2eApp();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /health returns ok', async () => {
        await request(app.getHttpServer())
            .get('/health')
            .expect(200)
            .expect({ status: 'ok' });
    });
});
