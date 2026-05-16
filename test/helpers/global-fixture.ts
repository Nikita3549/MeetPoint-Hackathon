import type { E2eFixture } from './e2e';
import { createE2eFixture } from './e2e';

type E2eGlobalState = {
    fixture?: Promise<E2eFixture>;
};

const globalState = globalThis as typeof globalThis & {
    __e2eGlobalState?: E2eGlobalState;
};

function getState(): E2eGlobalState {
    if (!globalState.__e2eGlobalState) {
        globalState.__e2eGlobalState = {};
    }

    return globalState.__e2eGlobalState;
}

export async function acquireE2eFixture(): Promise<E2eFixture> {
    const state = getState();

    state.fixture ??= createE2eFixture();

    return state.fixture;
}
