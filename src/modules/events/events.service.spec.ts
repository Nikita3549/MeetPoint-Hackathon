import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MatchRequestStatus, UserRole } from '@prisma/client';
import { TagsService } from '../../common/tags/tags.service';
import { ImagesService } from '../images/images.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from './events.service';

describe('EventsService', () => {
    let service: EventsService;
    const prisma = {
        event: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        eventParticipant: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            upsert: jest.fn(),
            count: jest.fn(),
        },
        matchRequest: {
            count: jest.fn(),
        },
    };
    const configService = {
        get: jest.fn(),
    };
    const tagsService = {
        resolveTagIds: jest.fn(),
        parseTagNames: jest.fn(),
    };
    const imagesService = {
        uploadImage: jest.fn(),
        deleteImage: jest.fn(),
    };

    const organizer = {
        id: 'org-1',
        email: 'org@example.com',
        role: UserRole.ORGANIZER,
    };

    const participant = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.PARTICIPANT,
    };

    const eventRecord = {
        id: 'event-1',
        slug: 'abc-defg-hij',
        title: 'Meetup',
        date: new Date('2025-06-01'),
        description: 'Desc',
        organizerId: 'org-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        organizer: { id: 'org-1', fullName: 'Organizer' },
        tags: [{ id: 'tag-1', name: 'Go' }],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: PrismaService, useValue: prisma },
                { provide: ConfigService, useValue: configService },
                { provide: TagsService, useValue: tagsService },
                { provide: ImagesService, useValue: imagesService },
            ],
        }).compile();

        service = module.get(EventsService);
        jest.clearAllMocks();
        configService.get.mockReturnValue(undefined);
    });

    describe('findAll', () => {
        it('returns mapped events', async () => {
            prisma.event.findMany.mockResolvedValue([eventRecord]);

            await expect(service.findAll()).resolves.toEqual([
                {
                    ...eventRecord,
                    imageUrl: null,
                    joinUrl: '/e/abc-defg-hij',
                },
            ]);
        });
    });

    describe('findOne', () => {
        it('returns event when found', async () => {
            prisma.event.findUnique.mockResolvedValue(eventRecord);

            await expect(service.findOne('event-1')).resolves.toEqual({
                ...eventRecord,
                imageUrl: null,
                joinUrl: '/e/abc-defg-hij',
            });
        });

        it('throws when event is not found', async () => {
            prisma.event.findUnique.mockResolvedValue(null);

            await expect(service.findOne('missing')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('findBySlug', () => {
        it('returns event by slug', async () => {
            prisma.event.findUnique.mockResolvedValue(eventRecord);

            await expect(service.findBySlug('abc-defg-hij')).resolves.toEqual({
                ...eventRecord,
                imageUrl: null,
                joinUrl: '/e/abc-defg-hij',
            });
        });
    });

    describe('findParticipatingEvents', () => {
        it('returns events with registration date', async () => {
            const registeredAt = new Date('2025-05-01');
            prisma.eventParticipant.findMany.mockResolvedValue([
                {
                    createdAt: registeredAt,
                    event: eventRecord,
                },
            ]);

            await expect(
                service.findParticipatingEvents('user-1'),
            ).resolves.toEqual([
                {
                    ...eventRecord,
                    imageUrl: null,
                    joinUrl: '/e/abc-defg-hij',
                    registeredAt,
                },
            ]);
        });
    });

    describe('register', () => {
        it('registers user for event', async () => {
            const registeredAt = new Date();
            prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
            prisma.eventParticipant.upsert.mockResolvedValue({
                id: 'part-1',
                eventId: 'event-1',
                userId: 'user-1',
                createdAt: registeredAt,
            });

            await expect(
                service.register(participant, 'event-1'),
            ).resolves.toEqual({
                id: 'part-1',
                eventId: 'event-1',
                userId: 'user-1',
                registeredAt,
            });
        });

        it('throws when event does not exist', async () => {
            prisma.event.findUnique.mockResolvedValue(null);

            await expect(
                service.register(participant, 'missing'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('registerBySlug', () => {
        it('registers user by slug', async () => {
            const registeredAt = new Date();
            prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
            prisma.eventParticipant.upsert.mockResolvedValue({
                id: 'part-1',
                eventId: 'event-1',
                userId: 'user-1',
                createdAt: registeredAt,
            });

            await expect(
                service.registerBySlug(participant, 'abc-defg-hij'),
            ).resolves.toEqual({
                id: 'part-1',
                eventId: 'event-1',
                userId: 'user-1',
                registeredAt,
            });
        });
    });

    describe('create', () => {
        it('creates event with unique slug and tags', async () => {
            tagsService.resolveTagIds.mockResolvedValue(['tag-1']);
            prisma.event.findUnique.mockResolvedValue(null);
            prisma.event.create.mockResolvedValue(eventRecord);

            await expect(
                service.create(organizer, {
                    title: 'Meetup',
                    date: '2025-06-01',
                    description: 'Desc',
                    tags: ['Go'],
                }),
            ).resolves.toEqual({
                ...eventRecord,
                imageUrl: null,
                joinUrl: '/e/abc-defg-hij',
            });
        });
    });

    describe('update', () => {
        it('updates event for organizer', async () => {
            prisma.event.findUnique.mockResolvedValue({
                organizerId: 'org-1',
            });
            tagsService.resolveTagIds.mockResolvedValue(['tag-1']);
            prisma.event.update.mockResolvedValue(eventRecord);

            await expect(
                service.update(organizer, 'event-1', {
                    title: 'Updated',
                    tags: ['Go'],
                }),
            ).resolves.toEqual({
                ...eventRecord,
                imageUrl: null,
                joinUrl: '/e/abc-defg-hij',
            });
        });

        it('throws when user is not organizer', async () => {
            prisma.event.findUnique.mockResolvedValue({
                organizerId: 'other-org',
            });

            await expect(
                service.update(organizer, 'event-1', { title: 'Updated' }),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('findParticipants', () => {
        it('returns participants filtered by tags', async () => {
            prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
            prisma.eventParticipant.findUnique.mockResolvedValue({ id: 'p1' });
            tagsService.parseTagNames.mockReturnValue(['Go']);
            tagsService.resolveTagIds.mockResolvedValue(['tag-1']);
            const registeredAt = new Date();
            prisma.eventParticipant.findMany.mockResolvedValue([
                {
                    createdAt: registeredAt,
                    user: {
                        id: 'user-2',
                        fullName: 'Other',
                        tags: [{ id: 'tag-1', name: 'Go' }],
                    },
                },
            ]);

            await expect(
                service.findParticipants(participant, 'event-1', 'Go'),
            ).resolves.toEqual([
                {
                    userId: 'user-2',
                    fullName: 'Other',
                    tags: [{ id: 'tag-1', name: 'Go' }],
                    registeredAt,
                },
            ]);
        });

        it('throws when user is not registered', async () => {
            prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
            prisma.eventParticipant.findUnique.mockResolvedValue(null);

            await expect(
                service.findParticipants(participant, 'event-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('getStats', () => {
        it('returns event statistics for organizer', async () => {
            prisma.event.findUnique.mockResolvedValue({
                organizerId: 'org-1',
            });
            prisma.eventParticipant.count.mockResolvedValue(10);
            prisma.matchRequest.count
                .mockResolvedValueOnce(5)
                .mockResolvedValueOnce(2);

            await expect(
                service.getStats(organizer, 'event-1'),
            ).resolves.toEqual({
                eventId: 'event-1',
                participantsRegistered: 10,
                matchRequestsSent: 5,
                matchRequestsAccepted: 2,
                acquaintancesMade: 2,
            });

            expect(prisma.matchRequest.count).toHaveBeenCalledWith({
                where: {
                    eventId: 'event-1',
                    status: MatchRequestStatus.ACCEPTED,
                },
            });
        });

        it('throws when organizer does not own event', async () => {
            prisma.event.findUnique.mockResolvedValue({
                organizerId: 'other-org',
            });

            await expect(
                service.getStats(organizer, 'event-1'),
            ).rejects.toThrow(ForbiddenException);
        });
    });

    describe('join url', () => {
        it('uses public base url when configured', async () => {
            configService.get.mockReturnValue('https://app.example.com/');
            prisma.event.findMany.mockResolvedValue([eventRecord]);

            await expect(service.findAll()).resolves.toEqual([
                {
                    ...eventRecord,
                    imageUrl: null,
                    joinUrl: 'https://app.example.com/e/abc-defg-hij',
                },
            ]);
        });
    });
});
