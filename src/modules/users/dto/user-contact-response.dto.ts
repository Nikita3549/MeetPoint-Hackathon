import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';

export class UserContactResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ enum: ContactType, example: ContactType.TELEGRAM })
    type: ContactType;

    @ApiProperty({ example: '@username' })
    value: string;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    updatedAt: Date;
}
