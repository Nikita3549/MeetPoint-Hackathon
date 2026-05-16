import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    const prisma = {
        user: {
            findFirst: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn().mockReturnValue('secret'),
                    },
                },
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        strategy = module.get(JwtStrategy);
        jest.clearAllMocks();
    });

    it('returns authenticated user when found', async () => {
        const user = {
            id: 'user-1',
            email: 'user@example.com',
            role: UserRole.PARTICIPANT,
        };
        prisma.user.findFirst.mockResolvedValue(user);

        await expect(
            strategy.validate({
                sub: 'user-1',
                email: 'user@example.com',
                role: UserRole.PARTICIPANT,
            }),
        ).resolves.toEqual(user);
    });

    it('throws when user is not found', async () => {
        prisma.user.findFirst.mockResolvedValue(null);

        await expect(
            strategy.validate({
                sub: 'user-1',
                email: 'user@example.com',
                role: UserRole.PARTICIPANT,
            }),
        ).rejects.toThrow(UnauthorizedException);
    });
});
