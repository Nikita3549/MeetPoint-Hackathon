import { execSync } from 'node:child_process';
import { loadE2eEnv } from './helpers/load-env';

export default function globalSetup(): void {
    loadE2eEnv();

    if (!process.env.DATABASE_URL) {
        throw new Error(
            'DATABASE_URL is required for e2e tests. Set it in .env or .env.test, or provide DATABASE_USER, DATABASE_PASSWORD, DATABASE_DBNAME and DATABASE_PORT.',
        );
    }

    execSync('npx prisma generate --schema prisma/schema', {
        stdio: 'inherit',
        env: process.env,
    });

    execSync('npx prisma migrate deploy --schema prisma/schema', {
        stdio: 'inherit',
        env: process.env,
    });
}
