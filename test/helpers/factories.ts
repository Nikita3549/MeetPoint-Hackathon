import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;
export const DEFAULT_PASSWORD = 'password123';

export async function createUser(
    prisma: PrismaClient,
    data: {
        email: string;
        fullName: string;
        role?: UserRole;
        status?: UserStatus;
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
            status: data.status ?? UserStatus.ACTIVE,
            hashedPassword,
            emailVerified: true,
            emailVerifiedAt: new Date(),
        },
    });
}
