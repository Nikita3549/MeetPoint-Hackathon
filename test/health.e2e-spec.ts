import request from 'supertest';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';

describe('Health (e2e)', () => {
    registerE2eHooks({ resetDatabase: false });

    it('GET /health returns ok', async () => {
        const { app } = getE2eFixture();

        await request(app.getHttpServer())
            .get('/health')
            .expect(200)
            .expect({ status: 'ok' });
    });
});
