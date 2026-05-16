import { PrismaClient } from '@prisma/client';

export async function truncateDatabase(prisma: PrismaClient): Promise<void> {
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
