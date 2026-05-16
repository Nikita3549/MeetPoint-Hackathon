import type { E2eFixture } from './e2e';
import { resetE2eDatabase } from './e2e';
import { acquireE2eFixture } from './global-fixture';

let fixture: E2eFixture | undefined;

export function registerE2eHooks(options?: { resetDatabase?: boolean }): void {
    const resetDatabase = options?.resetDatabase ?? true;

    beforeAll(async () => {
        fixture = await acquireE2eFixture();
    });

    if (resetDatabase) {
        beforeEach(async () => {
            await resetE2eDatabase(getE2eFixture().prisma);
        });
    }

    afterAll(() => {
        fixture = undefined;
    });
}

export function getE2eFixture(): E2eFixture {
    if (!fixture) {
        throw new Error('E2E fixture is not initialized');
    }

    return fixture;
}
