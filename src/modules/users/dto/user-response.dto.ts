import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { TagResponseDto } from '../../../common/dto/tag-response.dto';
import { UserContactResponseDto } from './user-contact-response.dto';

export class UserResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'user@example.com' })
    email: string;

    @ApiProperty({ example: 'Jane Doe' })
    fullName: string;

    @ApiProperty({ enum: UserRole, example: UserRole.USER })
    role: UserRole;

    @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE })
    status: UserStatus;

    @ApiProperty({ example: true })
    emailVerified: boolean;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z', nullable: true })
    emailVerifiedAt: Date | null;

    @ApiProperty({ type: [TagResponseDto] })
    tags: TagResponseDto[];

    @ApiProperty({ type: [UserContactResponseDto] })
    contacts: UserContactResponseDto[];

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    updatedAt: Date;
}
