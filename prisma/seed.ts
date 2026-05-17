import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'password123';
const BCRYPT_ROUNDS = 10;

async function main() {
    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);

    const regularUsers = Array.from({ length: 18 }, (_, index) => {
        const n = index + 1;
        return {
            email: `user${n}@example.com`,
            hashedPassword,
            fullName: `User ${n}`,
            emailVerified: true,
            emailVerifiedAt: new Date(),
        };
    });

    const organizers = Array.from({ length: 2 }, (_, index) => {
        const n = index + 1;
        return {
            email: `organizer${n}@example.com`,
            hashedPassword,
            fullName: `Organizer ${n}`,
            emailVerified: true,
            emailVerifiedAt: new Date(),
        };
    });

    for (const user of [...regularUsers, ...organizers]) {
        await prisma.user.upsert({
            where: { email: user.email },
            update: {
                hashedPassword: user.hashedPassword,
                fullName: user.fullName,
                emailVerified: user.emailVerified,
                emailVerifiedAt: user.emailVerifiedAt,
            },
            create: user,
        });
    }

    console.log('Seeded 20 users (18 regular, 2 organizers)');
    console.log(`Password for all: ${DEFAULT_PASSWORD}`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
