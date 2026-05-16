import { AppController } from './app.controller';

describe('AppController', () => {
    const controller = new AppController();

    it('returns health status', () => {
        expect(controller.health()).toEqual({ status: 'ok' });
    });
});
