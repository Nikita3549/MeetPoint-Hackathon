import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '../..');

export function loadE2eEnv(): void {
    for (const file of ['.env', '.env.test'] as const) {
        const path = resolve(projectRoot, file);
        if (existsSync(path)) {
            config({ path, override: file === '.env.test' });
        }
    }

    if (process.env.DATABASE_URL) {
        return;
    }

    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const database = process.env.DATABASE_DBNAME;
    const port = process.env.DATABASE_PORT ?? '5432';

    if (user && password && database) {
        process.env.DATABASE_URL = `postgresql://${user}:${password}@127.0.0.1:${port}/${database}?schema=public`;
    }
}
