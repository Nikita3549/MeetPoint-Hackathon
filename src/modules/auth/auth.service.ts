import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserContact, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserContactItemDto } from '../users/dto/user-contact-item.dto';
import { UserContactResponseDto } from '../users/dto/user-contact-response.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

const REGISTER_PASSWORD = 'password123';
const REGISTER_EMAIL_MIN = 100;
const REGISTER_EMAIL_MAX = 1000;
const REGISTER_EMAIL_MAX_ATTEMPTS = 50;

const userAuthInclude = {
    contacts: {
        orderBy: [{ type: 'asc' as const }, { createdAt: 'asc' as const }],
    },
} satisfies Prisma.UserInclude;

type UserWithAuthRelations = Prisma.UserGetPayload<{
    include: typeof userAuthInclude;
}>;

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    async login(dto: LoginDto): Promise<LoginResponseDto> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: userAuthInclude,
        });

        if (
            !user ||
            user.deletedAt !== null ||
            user.status !== UserStatus.ACTIVE
        ) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(
            dto.password,
            user.hashedPassword,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        return this.buildAuthResponse(user);
    }

    async register(dto: RegisterDto): Promise<LoginResponseDto> {
        const email = await this.generateRegisterEmail();
        const hashedPassword = await bcrypt.hash(REGISTER_PASSWORD, 10);
        const contacts = this.normalizeContacts(dto.contacts);

        const user = await this.prisma.user.create({
            data: {
                email,
                hashedPassword,
                fullName: dto.username.trim(),
                lastLoginAt: new Date(),
                contacts: {
                    create: contacts.map((contact) => ({
                        type: contact.type,
                        value: contact.value,
                    })),
                },
            },
            include: userAuthInclude,
        });

        return this.buildAuthResponse(user);
    }

    private async generateRegisterEmail(): Promise<string> {
        for (
            let attempt = 0;
            attempt < REGISTER_EMAIL_MAX_ATTEMPTS;
            attempt++
        ) {
            const suffix =
                Math.floor(
                    Math.random() *
                        (REGISTER_EMAIL_MAX - REGISTER_EMAIL_MIN + 1),
                ) + REGISTER_EMAIL_MIN;
            const email = `user${suffix}@example.com`;
            const existingUser = await this.prisma.user.findUnique({
                where: { email },
                select: { id: true },
            });

            if (!existingUser) {
                return email;
            }
        }

        throw new ConflictException('Email already registered');
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

    private async buildAuthResponse(
        user: UserWithAuthRelations,
    ): Promise<LoginResponseDto> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
        };

        return {
            accessToken: await this.jwtService.signAsync(payload),
            name: user.fullName,
            contacts: user.contacts.map((contact) =>
                this.toContactResponse(contact),
            ),
        };
    }

    private toContactResponse(contact: UserContact): UserContactResponseDto {
        return {
            id: contact.id,
            type: contact.type,
            value: contact.value,
        };
    }
}
