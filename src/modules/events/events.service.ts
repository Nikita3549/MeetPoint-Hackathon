import {
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MatchRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { EventStatsResponseDto } from './dto/event-stats-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { generateEventSlug } from './utils/generate-event-slug';

const eventInclude = {
    organizer: {
        select: {
            id: true,
            fullName: true,
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

type EventWithRelations = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class EventsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async findAll(): Promise<EventResponseDto[]> {
        const events = await this.prisma.event.findMany({
            include: eventInclude,
            orderBy: { date: 'asc' },
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
        const tagIds = await this.resolveTagIds(dto.tags);
        const slug = await this.generateUniqueSlug();

        const event = await this.prisma.event.create({
            data: {
                slug,
                title: dto.title,
                date: new Date(dto.date),
                description: dto.description,
                organizerId: user.id,
                tags: {
                    connect: tagIds.map((id) => ({ id })),
                },
            },
            include: eventInclude,
        });

        return this.toResponse(event);
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
            const tagIds = await this.resolveTagIds(dto.tags);
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
        return {
            ...event,
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

    private async resolveTagIds(tagNames: string[]): Promise<string[]> {
        const uniqueNames = [
            ...new Set(
                tagNames.map((name) => name.trim()).filter((name) => name.length > 0),
            ),
        ];

        if (uniqueNames.length === 0) {
            return [];
        }

        const tags = await Promise.all(
            uniqueNames.map((name) =>
                this.prisma.tag.upsert({
                    where: { name },
                    create: { name },
                    update: {},
                }),
            ),
        );

        return tags.map((tag) => tag.id);
    }
}
