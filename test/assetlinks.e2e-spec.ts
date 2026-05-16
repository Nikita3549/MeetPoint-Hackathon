import request from 'supertest';
import { ASSET_LINKS } from '../src/common/assetlinks';
import { getE2eFixture, registerE2eHooks } from './helpers/setup-e2e';

describe('Asset links (e2e)', () => {
    registerE2eHooks({ resetDatabase: false });

    it('GET /.well-known/assetlinks.json returns Android app links', async () => {
        const { app } = getE2eFixture();

        await request(app.getHttpServer())
            .get('/.well-known/assetlinks.json')
            .expect(200)
            .expect(ASSET_LINKS);
    });
});
