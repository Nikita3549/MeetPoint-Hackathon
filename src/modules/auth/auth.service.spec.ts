import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt');

describe('AuthService', () => {
    let service: AuthService;
    const prisma = {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    };
    const jwtService = {
        signAsync: jest.fn(),
    };

    const activeUser = {
        id: 'user-1',
        email: 'user@example.com',
        hashedPassword: 'hash',
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        deletedAt: null,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: PrismaService, useValue: prisma },
                { provide: JwtService, useValue: jwtService },
            ],
        }).compile();

        service = module.get(AuthService);
        jest.clearAllMocks();
    });

    it('returns access token on successful login', async () => {
        prisma.user.findUnique.mockResolvedValue(activeUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        prisma.user.update.mockResolvedValue(activeUser);
        jwtService.signAsync.mockResolvedValue('token');

        await expect(
            service.login({ email: 'user@example.com', password: 'secret' }),
        ).resolves.toEqual({ accessToken: 'token' });

        expect(prisma.user.update).toHaveBeenCalledWith({
            where: { id: 'user-1' },
            data: { lastLoginAt: expect.any(Date) },
        });
        expect(jwtService.signAsync).toHaveBeenCalledWith({
            sub: 'user-1',
            email: 'user@example.com',
            role: UserRole.PARTICIPANT,
        });
    });

    it('throws when user is not found', async () => {
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(
            service.login({ email: 'user@example.com', password: 'secret' }),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user is deleted', async () => {
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            deletedAt: new Date(),
        });

        await expect(
            service.login({ email: 'user@example.com', password: 'secret' }),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when user is not active', async () => {
        prisma.user.findUnique.mockResolvedValue({
            ...activeUser,
            status: UserStatus.BANNED,
        });

        await expect(
            service.login({ email: 'user@example.com', password: 'secret' }),
        ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when password is invalid', async () => {
        prisma.user.findUnique.mockResolvedValue(activeUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(
            service.login({ email: 'user@example.com', password: 'wrong' }),
        ).rejects.toThrow(UnauthorizedException);
    });
});
