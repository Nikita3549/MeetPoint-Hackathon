import { BadRequestException, Injectable } from '@nestjs/common';
import { ContactType, UserContact } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SetUserContactsDto } from './dto/set-user-contacts.dto';
import { UserContactItemDto } from './dto/user-contact-item.dto';
import { UserContactResponseDto } from './dto/user-contact-response.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async getContacts(userId: string): Promise<UserContactResponseDto[]> {
        const contacts = await this.prisma.userContact.findMany({
            where: { userId },
            orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
        });

        return contacts.map((contact) => this.toResponse(contact));
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
