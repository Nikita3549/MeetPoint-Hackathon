import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserContact, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserContactResponseDto } from '../users/dto/user-contact-response.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

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

    async register(dto: LoginDto): Promise<LoginResponseDto> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
            select: { id: true },
        });

        if (existingUser) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                hashedPassword,
                fullName: this.deriveNameFromEmail(dto.email),
                lastLoginAt: new Date(),
            },
            include: userAuthInclude,
        });

        return this.buildAuthResponse(user);
    }

    private async buildAuthResponse(
        user: UserWithAuthRelations,
    ): Promise<LoginResponseDto> {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return {
            accessToken: await this.jwtService.signAsync(payload),
            name: user.fullName,
            contacts: user.contacts.map((contact) =>
                this.toContactResponse(contact),
            ),
        };
    }

    private deriveNameFromEmail(email: string): string {
        const localPart = email.split('@')[0]?.trim();

        return localPart || 'User';
    }

    private toContactResponse(contact: UserContact): UserContactResponseDto {
        return {
            id: contact.id,
            type: contact.type,
            value: contact.value,
        };
    }
}
