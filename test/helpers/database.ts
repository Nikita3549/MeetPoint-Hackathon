import { PrismaClient } from '@prisma/client';

const E2E_DB_LOCK_KEY = 742_001;

export async function truncateDatabase(
    prisma: Pick<
        PrismaClient,
        '$executeRaw' | '$queryRaw' | '$executeRawUnsafe'
    >,
): Promise<void> {
    await prisma.$executeRaw`SELECT pg_advisory_lock(${E2E_DB_LOCK_KEY})`;

    try {
        await truncateTables(prisma);
    } finally {
        await prisma.$executeRaw`SELECT pg_advisory_unlock(${E2E_DB_LOCK_KEY})`;
    }
}

async function truncateTables(
    prisma: Pick<
        PrismaClient,
        '$executeRaw' | '$queryRaw' | '$executeRawUnsafe'
    >,
): Promise<void> {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename NOT IN ('_prisma_migrations')
    `;

    if (tables.length === 0) {
        return;
    }

    const tableList = tables
        .map(({ tablename }) => `"${tablename}"`)
        .join(', ');

    await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
    );
}
