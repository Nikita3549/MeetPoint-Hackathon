import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchRequestStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MatchRequestsService } from './match-requests.service';

describe('MatchRequestsService', () => {
    let service: MatchRequestsService;
    const prisma = {
        event: {
            findUnique: jest.fn(),
        },
        eventParticipant: {
            findUnique: jest.fn(),
        },
        matchRequest: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
    };

    const userA = {
        id: 'user-a',
        email: 'a@example.com',
        role: UserRole.PARTICIPANT,
    };

    const userB = {
        id: 'user-b',
        email: 'b@example.com',
        role: UserRole.PARTICIPANT,
    };

    const matchRequestRecord = {
        id: 'req-1',
        eventId: 'event-1',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        status: MatchRequestStatus.PENDING,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        respondedAt: null,
        fromUser: { id: 'user-a', fullName: 'User A' },
        toUser: { id: 'user-b', fullName: 'User B' },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MatchRequestsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get(MatchRequestsService);
        jest.clearAllMocks();
        prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
        prisma.eventParticipant.findUnique.mockResolvedValue({ id: 'part-1' });
        prisma.matchRequest.findUnique.mockResolvedValue(null);
        prisma.matchRequest.findMany.mockResolvedValue([]);
        prisma.matchRequest.findFirst.mockResolvedValue(null);
        prisma.matchRequest.create.mockResolvedValue(matchRequestRecord);
        prisma.matchRequest.update.mockResolvedValue(matchRequestRecord);
    });

    describe('create', () => {
        it('throws when sending request to self', async () => {
            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-a' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws when outgoing request already exists', async () => {
            prisma.matchRequest.findUnique.mockImplementation(async (args) => {
                if ('eventId_fromUserId_toUserId' in args.where) {
                    const key = args.where.eventId_fromUserId_toUserId;
                    if (
                        key.fromUserId === 'user-a' &&
                        key.toUserId === 'user-b'
                    ) {
                        return matchRequestRecord;
                    }
                }
                return null;
            });

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(ConflictException);
        });

        it('throws when users are already matched', async () => {
            prisma.matchRequest.findUnique.mockImplementation(async (args) => {
                if ('eventId_fromUserId_toUserId' in args.where) {
                    const key = args.where.eventId_fromUserId_toUserId;
                    if (
                        key.fromUserId === 'user-b' &&
                        key.toUserId === 'user-a'
                    ) {
                        return {
                            ...matchRequestRecord,
                            status: MatchRequestStatus.ACCEPTED,
                        };
                    }
                }
                return null;
            });

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(ConflictException);
        });

        it('accepts reverse pending request automatically', async () => {
            const reverseRequest = {
                ...matchRequestRecord,
                fromUserId: 'user-b',
                toUserId: 'user-a',
                fromUser: { id: 'user-b', fullName: 'User B' },
                toUser: { id: 'user-a', fullName: 'User A' },
            };
            const accepted = {
                ...reverseRequest,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
                fromUser: { id: 'user-b', fullName: 'User B' },
                toUser: { id: 'user-a', fullName: 'User A' },
            };
            prisma.matchRequest.findUnique.mockImplementation(async (args) => {
                if ('eventId_fromUserId_toUserId' in args.where) {
                    const key = args.where.eventId_fromUserId_toUserId;
                    if (
                        key.fromUserId === 'user-b' &&
                        key.toUserId === 'user-a'
                    ) {
                        return reverseRequest;
                    }
                }
                return null;
            });
            prisma.matchRequest.update.mockResolvedValue(accepted);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.ACCEPTED,
                fromUser: { id: 'user-b', fullName: 'User B' },
                toUser: { id: 'user-a', fullName: 'User A' },
                createdAt: reverseRequest.createdAt,
                respondedAt: accepted.respondedAt,
            });
        });

        it('creates new match request', async () => {
            prisma.matchRequest.findUnique.mockResolvedValue(null);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.PENDING,
                fromUser: { id: 'user-a', fullName: 'User A' },
                toUser: { id: 'user-b', fullName: 'User B' },
                createdAt: matchRequestRecord.createdAt,
                respondedAt: null,
            });
        });

        it('throws when participant is not registered', async () => {
            prisma.eventParticipant.findUnique.mockResolvedValue(null);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('findIncoming', () => {
        it('returns incoming pending requests', async () => {
            prisma.matchRequest.findMany.mockResolvedValue([
                matchRequestRecord,
            ]);

            await expect(
                service.findIncoming(userB, 'event-1'),
            ).resolves.toEqual([
                {
                    id: 'req-1',
                    eventId: 'event-1',
                    status: MatchRequestStatus.PENDING,
                    fromUser: { id: 'user-a', fullName: 'User A' },
                    toUser: { id: 'user-b', fullName: 'User B' },
                    createdAt: matchRequestRecord.createdAt,
                    respondedAt: null,
                },
            ]);
        });
    });

    describe('accept', () => {
        it('accepts incoming request', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue(matchRequestRecord);
            const accepted = {
                ...matchRequestRecord,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
            };
            prisma.matchRequest.update.mockResolvedValue(accepted);

            await expect(
                service.accept(userB, 'event-1', 'req-1'),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.ACCEPTED,
                fromUser: { id: 'user-a', fullName: 'User A' },
                toUser: { id: 'user-b', fullName: 'User B' },
                createdAt: matchRequestRecord.createdAt,
                respondedAt: accepted.respondedAt,
            });
        });

        it('throws when request is not pending', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue({
                ...matchRequestRecord,
                status: MatchRequestStatus.ACCEPTED,
            });

            await expect(
                service.accept(userB, 'event-1', 'req-1'),
            ).rejects.toThrow(ConflictException);
        });

        it('throws when request is not found', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue(null);

            await expect(
                service.accept(userB, 'event-1', 'missing'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('reject', () => {
        it('rejects incoming request', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue(matchRequestRecord);
            const rejected = {
                ...matchRequestRecord,
                status: MatchRequestStatus.REJECTED,
                respondedAt: new Date('2025-01-02'),
            };
            prisma.matchRequest.update.mockResolvedValue(rejected);

            await expect(
                service.reject(userB, 'event-1', 'req-1'),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.REJECTED,
                fromUser: { id: 'user-a', fullName: 'User A' },
                toUser: { id: 'user-b', fullName: 'User B' },
                createdAt: matchRequestRecord.createdAt,
                respondedAt: rejected.respondedAt,
            });
        });
    });

    describe('findMatches', () => {
        it('returns matched users with contacts', async () => {
            const respondedAt = new Date('2025-01-02');
            const contact = {
                id: 'contact-1',
                type: 'TELEGRAM',
                value: '@user',
                createdAt: new Date('2025-01-01'),
                updatedAt: new Date('2025-01-01'),
            };
            prisma.matchRequest.findMany.mockResolvedValue([
                {
                    ...matchRequestRecord,
                    status: MatchRequestStatus.ACCEPTED,
                    respondedAt,
                    fromUser: {
                        id: 'user-a',
                        fullName: 'User A',
                        contacts: [],
                    },
                    toUser: {
                        id: 'user-b',
                        fullName: 'User B',
                        contacts: [contact],
                    },
                },
            ]);

            await expect(
                service.findMatches(userA, 'event-1'),
            ).resolves.toEqual([
                {
                    matchRequestId: 'req-1',
                    user: { id: 'user-b', fullName: 'User B' },
                    contacts: [contact],
                    matchedAt: respondedAt,
                },
            ]);
        });
    });
});
