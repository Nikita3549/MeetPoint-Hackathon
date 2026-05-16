import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { MatchRequest, MatchRequestStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserContactResponseDto } from '../users/dto/user-contact-response.dto';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
import { MatchRequestResponseDto } from './dto/match-request-response.dto';
import { MatchRequestUserDto } from './dto/match-request-user.dto';
import { MatchResponseDto } from './dto/match-response.dto';

const matchRequestInclude = {
    fromUser: {
        select: {
            id: true,
            fullName: true,
        },
    },
    toUser: {
        select: {
            id: true,
            fullName: true,
        },
    },
} satisfies Prisma.MatchRequestInclude;

type MatchRequestWithUsers = Prisma.MatchRequestGetPayload<{
    include: typeof matchRequestInclude;
}>;

@Injectable()
export class MatchRequestsService {
    constructor(private readonly prisma: PrismaService) {}

    async create(
        user: AuthenticatedUser,
        eventId: string,
        dto: CreateMatchRequestDto,
    ): Promise<MatchRequestResponseDto> {
        if (user.id === dto.toUserId) {
            throw new BadRequestException(
                'Cannot send match request to yourself',
            );
        }

        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);
        await this.ensureParticipant(eventId, dto.toUserId);

        const existingOutgoing = await this.prisma.matchRequest.findUnique({
            where: {
                eventId_fromUserId_toUserId: {
                    eventId,
                    fromUserId: user.id,
                    toUserId: dto.toUserId,
                },
            },
        });

        if (existingOutgoing) {
            throw new ConflictException('Match request already sent');
        }

        const reverseRequest = await this.prisma.matchRequest.findUnique({
            where: {
                eventId_fromUserId_toUserId: {
                    eventId,
                    fromUserId: dto.toUserId,
                    toUserId: user.id,
                },
            },
        });

        if (reverseRequest?.status === MatchRequestStatus.ACCEPTED) {
            throw new ConflictException('Users are already matched');
        }

        if (reverseRequest?.status === MatchRequestStatus.PENDING) {
            const accepted = await this.prisma.matchRequest.update({
                where: { id: reverseRequest.id },
                data: {
                    status: MatchRequestStatus.ACCEPTED,
                    respondedAt: new Date(),
                },
                include: matchRequestInclude,
            });

            return this.toResponse(accepted);
        }

        const created = await this.prisma.matchRequest.create({
            data: {
                eventId,
                fromUserId: user.id,
                toUserId: dto.toUserId,
            },
            include: matchRequestInclude,
        });

        return this.toResponse(created);
    }

    async findIncoming(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<MatchRequestResponseDto[]> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);

        const requests = await this.prisma.matchRequest.findMany({
            where: {
                eventId,
                toUserId: user.id,
                status: MatchRequestStatus.PENDING,
            },
            include: matchRequestInclude,
            orderBy: { createdAt: 'desc' },
        });

        return requests.map((request) => this.toResponse(request));
    }

    async findOutgoing(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<MatchRequestResponseDto[]> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);

        const requests = await this.prisma.matchRequest.findMany({
            where: {
                eventId,
                fromUserId: user.id,
                status: MatchRequestStatus.PENDING,
            },
            include: matchRequestInclude,
            orderBy: { createdAt: 'desc' },
        });

        return requests.map((request) => this.toResponse(request));
    }

    async accept(
        user: AuthenticatedUser,
        eventId: string,
        requestId: string,
    ): Promise<MatchRequestResponseDto> {
        const request = await this.findOwnedIncomingRequest(
            user.id,
            eventId,
            requestId,
        );

        if (request.status !== MatchRequestStatus.PENDING) {
            throw new ConflictException('Match request is no longer pending');
        }

        const updated = await this.prisma.matchRequest.update({
            where: { id: request.id },
            data: {
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date(),
            },
            include: matchRequestInclude,
        });

        return this.toResponse(updated);
    }

    async reject(
        user: AuthenticatedUser,
        eventId: string,
        requestId: string,
    ): Promise<MatchRequestResponseDto> {
        const request = await this.findOwnedIncomingRequest(
            user.id,
            eventId,
            requestId,
        );

        if (request.status !== MatchRequestStatus.PENDING) {
            throw new ConflictException('Match request is no longer pending');
        }

        const updated = await this.prisma.matchRequest.update({
            where: { id: request.id },
            data: {
                status: MatchRequestStatus.REJECTED,
                respondedAt: new Date(),
            },
            include: matchRequestInclude,
        });

        return this.toResponse(updated);
    }

    async findMatches(
        user: AuthenticatedUser,
        eventId: string,
    ): Promise<MatchResponseDto[]> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, user.id);

        const requests = await this.prisma.matchRequest.findMany({
            where: {
                eventId,
                status: MatchRequestStatus.ACCEPTED,
                OR: [{ fromUserId: user.id }, { toUserId: user.id }],
            },
            include: {
                ...matchRequestInclude,
                fromUser: {
                    select: {
                        id: true,
                        fullName: true,
                        contacts: {
                            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
                        },
                    },
                },
                toUser: {
                    select: {
                        id: true,
                        fullName: true,
                        contacts: {
                            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
                        },
                    },
                },
            },
            orderBy: { respondedAt: 'desc' },
        });

        return requests.map((request) =>
            this.toMatchResponse(request, user.id),
        );
    }

    private async findOwnedIncomingRequest(
        userId: string,
        eventId: string,
        requestId: string,
    ): Promise<MatchRequest> {
        await this.ensureEventExists(eventId);
        await this.ensureParticipant(eventId, userId);

        const request = await this.prisma.matchRequest.findFirst({
            where: {
                id: requestId,
                eventId,
                toUserId: userId,
            },
        });

        if (!request) {
            throw new NotFoundException('Match request not found');
        }

        return request;
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
        const participant = await this.prisma.eventParticipant.findUnique({
            where: {
                userId_eventId: {
                    userId,
                    eventId,
                },
            },
            select: { id: true },
        });

        if (!participant) {
            throw new ForbiddenException(
                'User is not registered for this event',
            );
        }
    }

    private toResponse(
        request: MatchRequestWithUsers,
    ): MatchRequestResponseDto {
        return {
            id: request.id,
            eventId: request.eventId,
            status: request.status,
            fromUser: this.toUserDto(request.fromUser),
            toUser: this.toUserDto(request.toUser),
            createdAt: request.createdAt,
            respondedAt: request.respondedAt,
        };
    }

    private toMatchResponse(
        request: MatchRequestWithUsers & {
            fromUser: MatchRequestWithUsers['fromUser'] & {
                contacts: {
                    id: string;
                    type: UserContactResponseDto['type'];
                    value: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
            };
            toUser: MatchRequestWithUsers['toUser'] & {
                contacts: {
                    id: string;
                    type: UserContactResponseDto['type'];
                    value: string;
                    createdAt: Date;
                    updatedAt: Date;
                }[];
            };
        },
        currentUserId: string,
    ): MatchResponseDto {
        const matchedUser =
            request.fromUserId === currentUserId
                ? request.toUser
                : request.fromUser;

        return {
            matchRequestId: request.id,
            user: this.toUserDto(matchedUser),
            contacts: matchedUser.contacts.map((contact) => ({
                id: contact.id,
                type: contact.type,
                value: contact.value,
                createdAt: contact.createdAt,
                updatedAt: contact.updatedAt,
            })),
            matchedAt: request.respondedAt ?? request.updatedAt,
        };
    }

    private toUserDto(user: {
        id: string;
        fullName: string;
    }): MatchRequestUserDto {
        return {
            id: user.id,
            fullName: user.fullName,
        };
    }
}
