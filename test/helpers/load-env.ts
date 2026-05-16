import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../..');

const E2E_DEFAULTS: Record<string, string> = {
    JWT_SECRET: 'e2e-jwt-secret',
    JWT_EXPIRES_IN: '1h',
    APP_PUBLIC_URL: 'https://app.test',
    CLOUDINARY_NAME: 'e2e-cloud',
    CLOUDINARY_KEY: 'e2e-key',
    CLOUDINARY_SECRET: 'e2e-secret',
};

function setEnvIfEmpty(key: string, value: string): void {
    if (!process.env[key]?.trim()) {
        process.env[key] = value;
    }
}

export function loadE2eEnv(): void {
    for (const file of ['.env', '.env.test'] as const) {
        const path = resolve(projectRoot, file);
        if (existsSync(path)) {
            config({ path, override: file === '.env.test' });
        }
    }

    if (!process.env.DATABASE_URL?.trim()) {
        const user = process.env.DATABASE_USER;
        const password = process.env.DATABASE_PASSWORD;
        const database = process.env.DATABASE_DBNAME;
        const port = process.env.DATABASE_PORT ?? '5432';

        if (user && password && database) {
            process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`;
        }
    }

    for (const [key, value] of Object.entries(E2E_DEFAULTS)) {
        setEnvIfEmpty(key, value);
    }
}
