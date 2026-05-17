import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchRequestStatus } from '@prisma/client';
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
        } as const,
    };

    const userA = {
        id: 'user-a',
        email: 'a@example.com',
    };

    const userB = {
        id: 'user-b',
        email: 'b@example.com',
    };

    const userWithTags = (
        id: string,
        fullName: string,
        tags: { id: string; name: string }[] = [],
    ) => ({
        id,
        fullName,
        eventParticipations: [{ tags }],
    });

    const matchRequestRecord = {
        id: 'req-1',
        eventId: 'event-1',
        fromUserId: 'user-a',
        toUserId: 'user-b',
        status: MatchRequestStatus.PENDING,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
        respondedAt: null,
        fromUser: userWithTags('user-a', 'User A', [
            { id: 'tag-1', name: 'backend' },
        ]),
        toUser: userWithTags('user-b', 'User B'),
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

        it('throws when sending a second request to the same user', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue(matchRequestRecord);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(
                new ConflictException('Match request already sent'),
            );

            expect(prisma.matchRequest.create).not.toHaveBeenCalled();
        });

        it('throws when users are already matched', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue({
                ...matchRequestRecord,
                fromUserId: 'user-b',
                toUserId: 'user-a',
                status: MatchRequestStatus.ACCEPTED,
            });

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(ConflictException);
        });

        it('throws when match request was declined between users', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue({
                ...matchRequestRecord,
                status: MatchRequestStatus.REJECTED,
            });

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).rejects.toThrow(ConflictException);
        });

        it('throws when other user already declined via reverse request', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue({
                ...matchRequestRecord,
                fromUserId: 'user-b',
                toUserId: 'user-a',
                status: MatchRequestStatus.REJECTED,
            });

            await expect(
                service.create(userB, 'event-1', { toUserId: 'user-a' }),
            ).rejects.toThrow(ConflictException);
        });

        it('accepts reverse pending request automatically', async () => {
            const reverseRequest = {
                ...matchRequestRecord,
                fromUserId: 'user-b',
                toUserId: 'user-a',
                fromUser: userWithTags('user-b', 'User B'),
                toUser: userWithTags('user-a', 'User A', [
                    { id: 'tag-1', name: 'backend' },
                ]),
            };
            const accepted = {
                ...reverseRequest,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
                fromUser: userWithTags('user-b', 'User B'),
                toUser: userWithTags('user-a', 'User A', [
                    { id: 'tag-1', name: 'backend' },
                ]),
            };
            prisma.matchRequest.findFirst.mockResolvedValue(reverseRequest);
            prisma.matchRequest.update.mockResolvedValue(accepted);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.ACCEPTED,
                fromUser: { id: 'user-b', fullName: 'User B', tags: [] },
                toUser: {
                    id: 'user-a',
                    fullName: 'User A',
                    tags: [{ id: 'tag-1', name: 'backend' }],
                },
                createdAt: reverseRequest.createdAt,
                respondedAt: accepted.respondedAt,
            });
        });

        it('creates new match request', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue(null);

            await expect(
                service.create(userA, 'event-1', { toUserId: 'user-b' }),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.PENDING,
                fromUser: {
                    id: 'user-a',
                    fullName: 'User A',
                    tags: [{ id: 'tag-1', name: 'backend' }],
                },
                toUser: { id: 'user-b', fullName: 'User B', tags: [] },
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
                    fromUser: {
                        id: 'user-a',
                        fullName: 'User A',
                        tags: [{ id: 'tag-1', name: 'backend' }],
                    },
                    toUser: { id: 'user-b', fullName: 'User B', tags: [] },
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
                fromUser: {
                    id: 'user-a',
                    fullName: 'User A',
                    tags: [{ id: 'tag-1', name: 'backend' }],
                },
                toUser: { id: 'user-b', fullName: 'User B', tags: [] },
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
                fromUser: {
                    id: 'user-a',
                    fullName: 'User A',
                    tags: [{ id: 'tag-1', name: 'backend' }],
                },
                toUser: { id: 'user-b', fullName: 'User B', tags: [] },
                createdAt: matchRequestRecord.createdAt,
                respondedAt: rejected.respondedAt,
            });
        });
    });

    describe('matchWithoutConfirm', () => {
        it('throws when matching with self', async () => {
            await expect(
                service.matchWithoutConfirm(userA, 'event-1', {
                    toUserId: 'user-a',
                }),
            ).rejects.toThrow(BadRequestException);
        });

        it('creates accepted match request immediately', async () => {
            const accepted = {
                ...matchRequestRecord,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
            };
            prisma.matchRequest.findFirst.mockResolvedValue(null);
            prisma.matchRequest.create.mockResolvedValue(accepted);

            await expect(
                service.matchWithoutConfirm(userA, 'event-1', {
                    toUserId: 'user-b',
                }),
            ).resolves.toEqual({
                id: 'req-1',
                eventId: 'event-1',
                status: MatchRequestStatus.ACCEPTED,
                fromUser: {
                    id: 'user-a',
                    fullName: 'User A',
                    tags: [{ id: 'tag-1', name: 'backend' }],
                },
                toUser: { id: 'user-b', fullName: 'User B', tags: [] },
                createdAt: matchRequestRecord.createdAt,
                respondedAt: accepted.respondedAt,
            });
            expect(prisma.matchRequest.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        status: MatchRequestStatus.ACCEPTED,
                        respondedAt: expect.any(Date),
                    }),
                }),
            );
        });

        it('accepts existing pending reverse request', async () => {
            const reverseRequest = {
                ...matchRequestRecord,
                fromUserId: 'user-b',
                toUserId: 'user-a',
                fromUser: userWithTags('user-b', 'User B'),
                toUser: userWithTags('user-a', 'User A', [
                    { id: 'tag-1', name: 'backend' },
                ]),
            };
            const accepted = {
                ...reverseRequest,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
            };
            prisma.matchRequest.findFirst.mockResolvedValue(reverseRequest);
            prisma.matchRequest.update.mockResolvedValue(accepted);

            await expect(
                service.matchWithoutConfirm(userA, 'event-1', {
                    toUserId: 'user-b',
                }),
            ).resolves.toEqual(
                expect.objectContaining({
                    status: MatchRequestStatus.ACCEPTED,
                }),
            );
            expect(prisma.matchRequest.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: reverseRequest.id },
                    data: expect.objectContaining({
                        status: MatchRequestStatus.ACCEPTED,
                    }),
                }),
            );
        });

        it('accepts previously declined request on instant match', async () => {
            const rejected = {
                ...matchRequestRecord,
                status: MatchRequestStatus.REJECTED,
            };
            const accepted = {
                ...rejected,
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2025-01-02'),
            };
            prisma.matchRequest.findFirst.mockResolvedValue(rejected);
            prisma.matchRequest.update.mockResolvedValue(accepted);

            await expect(
                service.matchWithoutConfirm(userA, 'event-1', {
                    toUserId: 'user-b',
                }),
            ).resolves.toEqual(
                expect.objectContaining({
                    status: MatchRequestStatus.ACCEPTED,
                }),
            );
        });

        it('throws when users are already matched', async () => {
            prisma.matchRequest.findFirst.mockResolvedValue({
                ...matchRequestRecord,
                status: MatchRequestStatus.ACCEPTED,
            });

            await expect(
                service.matchWithoutConfirm(userA, 'event-1', {
                    toUserId: 'user-b',
                }),
            ).rejects.toThrow(ConflictException);
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
            const contactResponse = {
                id: 'contact-1',
                type: 'TELEGRAM',
                value: '@user',
            };
            prisma.matchRequest.findMany.mockResolvedValue([
                {
                    ...matchRequestRecord,
                    status: MatchRequestStatus.ACCEPTED,
                    respondedAt,
                    fromUser: {
                        ...userWithTags('user-a', 'User A'),
                        contacts: [],
                    },
                    toUser: {
                        ...userWithTags('user-b', 'User B', [
                            { id: 'tag-2', name: 'ai' },
                        ]),
                        contacts: [contact],
                    },
                },
            ]);

            await expect(
                service.findMatches(userA, 'event-1'),
            ).resolves.toEqual([
                {
                    matchRequestId: 'req-1',
                    user: {
                        id: 'user-b',
                        fullName: 'User B',
                        tags: [{ id: 'tag-2', name: 'ai' }],
                    },
                    contacts: [contactResponse],
                    matchedAt: respondedAt,
                },
            ]);
        });
    });
});
