import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { UserContact } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { EventsService } from '../events/events.service';
import { ImagesService } from '../images/images.service';
import { MatchRequestsService } from '../match-requests/match-requests.service';
import { SetUserContactsDto } from './dto/set-user-contacts.dto';
import { UserAvatarResponseDto } from './dto/user-avatar-response.dto';
import { UserContactItemDto } from './dto/user-contact-item.dto';
import { UserContactResponseDto } from './dto/user-contact-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { buildUserUpdateData } from './user-updatable-fields';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly imagesService: ImagesService,
        private readonly eventsService: EventsService,
        private readonly matchRequestsService: MatchRequestsService,
    ) {}

    async getMe(userId: string): Promise<UserResponseDto> {
        const [user, events, matches] = await Promise.all([
            this.findUserProfile(userId),
            this.eventsService.findParticipatingEvents(userId),
            this.matchRequestsService.findAllMatchesForUser(userId),
        ]);

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            status: user.status,
            emailVerified: user.emailVerified,
            emailVerifiedAt: user.emailVerifiedAt,
            contacts: user.contacts.map((contact) => this.toResponse(contact)),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            avatarImage: user.avatarImage || null,
            events,
            matches,
        };
    }

    private async findUserProfile(userId: string) {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                fullName: true,
                status: true,
                emailVerified: true,
                emailVerifiedAt: true,
                createdAt: true,
                updatedAt: true,
                avatarImage: {
                    select: {
                        id: true,
                        url: true,
                    },
                },
                contacts: {
                    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateMe(
        user: AuthenticatedUser,
        body: Record<string, unknown>,
    ): Promise<UserResponseDto> {
        const data = buildUserUpdateData(body);

        const email = data.email;

        if (typeof email === 'string') {
            const existing = await this.prisma.user.findFirst({
                where: {
                    email,
                    id: { not: user.id },
                    deletedAt: null,
                },
                select: { id: true },
            });

            if (existing) {
                throw new ConflictException('Email already registered');
            }
        }

        if (Object.keys(data).length > 0) {
            const result = await this.prisma.user.updateMany({
                where: { id: user.id, deletedAt: null },
                data,
            });

            if (result.count === 0) {
                throw new NotFoundException('User not found');
            }
        }

        return this.getMe(user.id);
    }

    async getContacts(userId: string): Promise<UserContactResponseDto[]> {
        const contacts = await this.prisma.userContact.findMany({
            where: { userId },
            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        });

        return contacts.map((contact) => this.toResponse(contact));
    }

    async uploadAvatar(
        user: AuthenticatedUser,
        file: Express.Multer.File,
    ): Promise<UserAvatarResponseDto> {
        const currentUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { avatarImageId: true },
        });

        const image = await this.imagesService.uploadImage(user.id, file);

        await this.prisma.user.update({
            where: { id: user.id },
            data: { avatarImageId: image.id },
        });

        if (currentUser?.avatarImageId) {
            await this.imagesService.deleteImage(currentUser.avatarImageId);
        }

        return { avatarUrl: image.url };
    }

    async setContacts(
        user: AuthenticatedUser,
        dto: SetUserContactsDto,
    ): Promise<UserContactResponseDto[]> {
        const normalized = this.normalizeContacts(dto.contacts);

        const contacts = await this.prisma.$transaction(async (tx) => {
            await tx.userContact.deleteMany({
                where: { userId: user.id },
            });

            if (normalized.length === 0) {
                return [];
            }

            await tx.userContact.createMany({
                data: normalized.map((contact) => ({
                    userId: user.id,
                    type: contact.type,
                    value: contact.value,
                })),
            });

            return tx.userContact.findMany({
                where: { userId: user.id },
                orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
            });
        });

        return contacts.map((contact) => this.toResponse(contact));
    }

    private normalizeContacts(
        contacts: UserContactItemDto[],
    ): UserContactItemDto[] {
        const seen = new Set<string>();
        const result: UserContactItemDto[] = [];

        for (const contact of contacts) {
            const value = contact.value.trim();

            if (value.length === 0) {
                continue;
            }

            const key = `${contact.type}:${value.toLowerCase()}`;

            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            result.push({ type: contact.type, value });
        }

        return result;
    }

    private toResponse(contact: UserContact): UserContactResponseDto {
        return {
            id: contact.id,
            type: contact.type,
            value: contact.value,
        };
    }
}
