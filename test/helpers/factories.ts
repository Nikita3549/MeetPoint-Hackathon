import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;
export const DEFAULT_PASSWORD = 'password123';

export async function createUser(
    prisma: PrismaClient,
    data: {
        email: string;
        fullName: string;
        role?: UserRole;
        password?: string;
    },
) {
    const hashedPassword = await bcrypt.hash(
        data.password ?? DEFAULT_PASSWORD,
        BCRYPT_ROUNDS,
    );

    return prisma.user.create({
        data: {
            email: data.email,
            fullName: data.fullName,
            role: data.role ?? UserRole.USER,
            hashedPassword,
            emailVerified: true,
            emailVerifiedAt: new Date(),
        },
    });
}
