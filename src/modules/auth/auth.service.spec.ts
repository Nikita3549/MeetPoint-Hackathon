import { ConflictException, UnauthorizedException } from '@nestjs/common';
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
            create: jest.fn(),
        },
    };
    const jwtService = {
        signAsync: jest.fn(),
    };

    const activeUser = {
        id: 'user-1',
        email: 'user@example.com',
        hashedPassword: 'hash',
        fullName: 'Jane Doe',
        role: UserRole.PARTICIPANT,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        tags: [{ id: 'tag-1', name: 'frontend' }],
        contacts: [
            {
                id: 'contact-1',
                type: 'TELEGRAM',
                value: '@jane',
                createdAt: new Date('2026-05-15T12:00:00.000Z'),
                updatedAt: new Date('2026-05-15T12:00:00.000Z'),
            },
        ],
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
        ).resolves.toEqual({
            accessToken: 'token',
            name: 'Jane Doe',
            tags: [{ id: 'tag-1', name: 'frontend' }],
            contacts: [
                {
                    id: 'contact-1',
                    type: 'TELEGRAM',
                    value: '@jane',
                },
            ],
        });

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

    it('creates user and returns access token on register', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue(activeUser);
        jwtService.signAsync.mockResolvedValue('token');

        await expect(
            service.register({
                email: 'user@example.com',
                password: 'secret',
            }),
        ).resolves.toEqual({
            accessToken: 'token',
            name: 'Jane Doe',
            tags: [{ id: 'tag-1', name: 'frontend' }],
            contacts: [
                {
                    id: 'contact-1',
                    type: 'TELEGRAM',
                    value: '@jane',
                },
            ],
        });

        expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
        expect(prisma.user.create).toHaveBeenCalledWith({
            data: {
                email: 'user@example.com',
                hashedPassword: 'hashed',
                fullName: 'user',
                lastLoginAt: expect.any(Date),
            },
            include: expect.any(Object),
        });
    });

    it('throws when email is already registered', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

        await expect(
            service.register({
                email: 'user@example.com',
                password: 'secret',
            }),
        ).rejects.toThrow(ConflictException);
    });

    it('uses fallback name when email local part is empty', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue({
            ...activeUser,
            email: '@company.com',
            fullName: 'User',
        });
        jwtService.signAsync.mockResolvedValue('token');

        await service.register({
            email: '@company.com',
            password: 'secret',
        });

        expect(prisma.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    fullName: 'User',
                }),
            }),
        );
    });

    it('returns empty contacts and tags for newly registered user', async () => {
        prisma.user.findUnique.mockResolvedValue(null);
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
        prisma.user.create.mockResolvedValue({
            ...activeUser,
            tags: [],
            contacts: [],
        });
        jwtService.signAsync.mockResolvedValue('token');

        await expect(
            service.register({
                email: 'new@example.com',
                password: 'secret',
            }),
        ).resolves.toEqual({
            accessToken: 'token',
            name: 'Jane Doe',
            tags: [],
            contacts: [],
        });
    });
});
