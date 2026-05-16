import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatchRequestStatus, Prisma, UserStatus } from '@prisma/client';
import { TagResponseDto } from '../../common/dto/tag-response.dto';
import { TagsService } from '../../common/tags/tags.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ImagesService } from '../images/images.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventParticipantResponseDto } from './dto/event-participant-response.dto';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { EventStatsResponseDto } from './dto/event-stats-response.dto';
import { UserEventResponseDto } from './dto/user-event-response.dto';
import { SetParticipantTagsDto } from './dto/set-participant-tags.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { generateEventSlug } from './utils/generate-event-slug';

const eventInclude = {
    organizer: {
        select: {
            id: true,
            fullName: true,
        },
    },
    coverImage: {
        select: {
            url: true,
        },
    },
    tags: {
        select: {
            id: true,
            name: true,
        },
        orderBy: {
            name: 'asc' as const,
        },
    },
} satisfies Prisma.EventInclude;

type EventWithRelations = Prisma.EventGetPayload<{
    include: typeof eventInclude;
}>;

@Injectable()
export class EventsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly imagesService: ImagesService,
        private readonly tagsService: TagsService,
    ) {}

    async findParticipatingEvents(
        userId: string,
    ): Promise<UserEventResponseDto[]> {
        const participations = await this.prisma.eventParticipant.findMany({
            where: { userId },
            include: {
                event: {
                    include: eventInclude,
                },
            },
            orderBy: { event: { date: 'asc' } },
        });

        return participations.map((participation) => ({
            ...this.toResponse(participation.event),
            registeredAt: participation.createdAt,
        }));
    }

    async findAll(): Promise<EventResponseDto[]> {
        const events = await this.prisma.event.findMany({
            include: eventInclude,
            orderBy: { date: 'asc' },
            where: {
                isPrivate: false,
            },
        });

        return events.map((event) => this.toResponse(event));
    }

    async findOne(id: string): Promise<EventResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: eventInclude,
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return this.toResponse(event);
    }

    async findBySlug(slug: string): Promise<EventResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { slug },
            include: eventInclude,
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return this.toResponse(event);
    }

    async register(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<EventRegistrationResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        const participant = await this.prisma.eventParticipant.upsert({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId,
                },
            },
            create: {
                userId: user.id,
                eventId,
            },
            update: {},
        });

        return this.toRegistrationResponse(participant);
    }

    async registerBySlug(
        user: AuthenticatedUser,
        slug: string,
    ): Promise<EventRegistrationResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { slug },
            select: { id: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        return this.register(user, event.id);
    }

    async create(
        user: AuthenticatedUser,
        dto: CreateEventDto,
    ): Promise<EventResponseDto> {
        const tagIds = await this.tagsService.resolveTagIds(dto.tags);
        const slug = await this.generateUniqueSlug();

        const event = await this.prisma.event.create({
            data: {
                slug,
                title: dto.title,
                date: new Date(dto.date),
                description: dto.description,
                isPrivate: dto.isPrivate ?? false,
                organizerId: user.id,
                tags: {
                    connect: tagIds.map((id) => ({ id })),
                },
            },
            include: eventInclude,
        });

        return this.toResponse(event);
    }

    async uploadCoverImage(
        user: AuthenticatedUser,
        eventId: string,
        file: Express.Multer.File,
    ): Promise<EventResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { organizerId: true, coverImageId: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.organizerId !== user.id) {
            throw new ForbiddenException();
        }

        const image = await this.imagesService.uploadImage(user.id, file);

        const updated = await this.prisma.event.update({
            where: { id: eventId },
            data: { coverImageId: image.id },
            include: eventInclude,
        });

        if (event.coverImageId) {
            await this.imagesService.deleteImage(event.coverImageId);
        }

        return this.toResponse(updated);
    }

    async update(
        user: AuthenticatedUser,
        id: string,
        dto: UpdateEventDto,
    ): Promise<EventResponseDto> {
        const event = await this.prisma.event.findUnique({
            where: { id },
            select: { organizerId: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.organizerId !== user.id) {
            throw new ForbiddenException();
        }

        const data: Prisma.EventUpdateInput = {};

        if (dto.title !== undefined) {
            data.title = dto.title;
        }

        if (dto.date !== undefined) {
            data.date = new Date(dto.date);
        }

        if (dto.description !== undefined) {
            data.description = dto.description;
        }

        if (dto.tags !== undefined) {
            const tagIds = await this.tagsService.resolveTagIds(dto.tags);
            data.tags = {
                set: tagIds.map((tagId) => ({ id: tagId })),
            };
        }

        const updated = await this.prisma.event.update({
            where: { id },
            data,
            include: eventInclude,
        });

        return this.toResponse(updated);
    }

    async getMyTags(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<TagResponseDto[]> {
        await this.ensureEventExists(eventId);
        const participant = await this.findParticipation(eventId, user.id);

        return participant.tags;
    }

    async setMyTags(
        user: AuthenticatedUser,
        eventId: string,
        dto: SetParticipantTagsDto,
    ): Promise<TagResponseDto[]> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);

        const tagIds = await this.tagsService.resolveTagIds(dto.tags);

        const updated = await this.prisma.eventParticipant.update({
            where: {
                userId_eventId: {
                    userId: user.id,
                    eventId,
                },
            },
            data: {
                tags: {
                    set: tagIds.map((id) => ({ id })),
                },
            },
            select: {
                tags: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
            },
        });

        return updated.tags;
    }

    async findParticipants(
        user: AuthenticatedUser,
        eventId: string,
        tags?: string,
    ): Promise<EventParticipantResponseDto[]> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);

        const tagNames = this.tagsService.parseTagNames(tags);
        const tagIds =
            tagNames.length > 0
                ? await this.tagsService.resolveTagIds(tagNames)
                : [];

        const participants = await this.prisma.eventParticipant.findMany({
            where: {
                eventId,
                userId: { not: user.id },
                user: {
                    status: UserStatus.ACTIVE,
                    deletedAt: null,
                },
                ...(tagIds.length > 0
                    ? {
                          AND: tagIds.map((tagId) => ({
                              tags: { some: { id: tagId } },
                          })),
                      }
                    : {}),
            },
            include: {
                tags: {
                    select: {
                        id: true,
                        name: true,
                    },
                    orderBy: { name: 'asc' },
                },
                user: {
                    select: {
                        id: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return participants.map((participant) =>
            this.toParticipantResponse(participant),
        );
    }

    async getStats(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<EventStatsResponseDto> {
        await this.ensureOrganizerOwnsEvent(user, eventId);

        const [
            participantsRegistered,
            matchRequestsSent,
            matchRequestsAccepted,
        ] = await Promise.all([
            this.prisma.eventParticipant.count({ where: { eventId } }),
            this.prisma.matchRequest.count({ where: { eventId } }),
            this.prisma.matchRequest.count({
                where: { eventId, status: MatchRequestStatus.ACCEPTED },
            }),
        ]);

        return {
            eventId,
            participantsRegistered,
            matchRequestsSent,
            matchRequestsAccepted,
            acquaintancesMade: matchRequestsAccepted,
        };
    }

    private async ensureEventExists(eventId: string): Promise<void> {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { id: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }
    }

    private async ensureParticipant(
        eventId: string,
        userId: string,
    ): Promise<void> {
        await this.findParticipation(eventId, userId);
    }

    private async findParticipation(
        eventId: string,
        userId: string,
    ): Promise<{ tags: TagResponseDto[] }> {
        const participant = await this.prisma.eventParticipant.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId,
                },
            },
            select: {
                tags: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
            },
        });

        if (!participant) {
            throw new ForbiddenException(
                'User is not registered for this event',
            );
        }

        return participant;
    }

    private async ensureOrganizerOwnsEvent(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<void> {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { organizerId: true },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (event.organizerId !== user.id) {
            throw new ForbiddenException();
        }
    }

    private toResponse(event: EventWithRelations): EventResponseDto {
        const { coverImage, ...rest } = event;

        return {
            ...rest,
            imageUrl: coverImage?.url ?? null,
            joinUrl: this.buildJoinUrl(event.slug),
        };
    }

    private toRegistrationResponse(participant: {
        id: string;
        eventId: string;
        userId: string;
        createdAt: Date;
    }): EventRegistrationResponseDto {
        return {
            id: participant.id,
            eventId: participant.eventId,
            userId: participant.userId,
            registeredAt: participant.createdAt,
        };
    }

    private toParticipantResponse(participant: {
        createdAt: Date;
        tags: TagResponseDto[];
        user: {
            id: string;
            fullName: string;
        };
    }): EventParticipantResponseDto {
        return {
            userId: participant.user.id,
            fullName: participant.user.fullName,
            tags: participant.tags,
            registeredAt: participant.createdAt,
        };
    }

    private buildJoinUrl(slug: string): string {
        const baseUrl = this.configService
            .get<string>('APP_PUBLIC_URL')
            ?.replace(/\/$/, '');

        if (!baseUrl) {
            return `/e/${slug}`;
        }

        return `${baseUrl}/e/${slug}`;
    }

    private async generateUniqueSlug(): Promise<string> {
        for (let attempt = 0; attempt < 20; attempt++) {
            const slug = generateEventSlug();
            const existing = await this.prisma.event.findUnique({
                where: { slug },
                select: { id: true },
            });

            if (!existing) {
                return slug;
            }
        }

        throw new InternalServerErrorException('Failed to generate event link');
    }
}
