import { Injectable, NotFoundException } from '@nestjs/common';
import { UserContact } from '@prisma/client';
import { TagResponseDto } from '../../common/dto/tag-response.dto';
import { TagsService } from '../../common/tags/tags.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { ImagesService } from '../images/images.service';
import { SetUserContactsDto } from './dto/set-user-contacts.dto';
import { UserAvatarResponseDto } from './dto/user-avatar-response.dto';
import { SetUserTagsDto } from './dto/set-user-tags.dto';
import { UserContactItemDto } from './dto/user-contact-item.dto';
import { UserContactResponseDto } from './dto/user-contact-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly imagesService: ImagesService,
        private readonly tagsService: TagsService,
    ) {}

    async getMe(userId: string): Promise<UserResponseDto> {
        const user = await this.prisma.user.findFirst({
            where: { id: userId, deletedAt: null },
            select: {
                id: true,
                email: true,
                fullName: true,
                role: true,
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
                tags: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
                contacts: {
                    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
            emailVerified: user.emailVerified,
            emailVerifiedAt: user.emailVerifiedAt,
            tags: user.tags,
            contacts: user.contacts.map((contact) => this.toResponse(contact)),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            avatarImage: user.avatarImage || null,
        };
    }

    async getTags(userId: string): Promise<TagResponseDto[]> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                tags: {
                    select: { id: true, name: true },
                    orderBy: { name: 'asc' },
                },
            },
        });

        return user?.tags ?? [];
    }

    async setTags(
        user: AuthenticatedUser,
        dto: SetUserTagsDto,
    ): Promise<TagResponseDto[]> {
        const tagIds = await this.tagsService.resolveTagIds(dto.tags);

        const updated = await this.prisma.user.update({
            where: { id: user.id },
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
            createdAt: contact.createdAt,
            updatedAt: contact.updatedAt,
        };
    }
}
