import { ApiProperty } from '@nestjs/swagger';
import { MatchRequestStatus } from '@prisma/client';
import { MatchRequestUserDto } from './match-request-user.dto';

export class MatchRequestResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    eventId: string;

    @ApiProperty({
        enum: MatchRequestStatus,
        example: MatchRequestStatus.PENDING,
    })
    status: MatchRequestStatus;

    @ApiProperty({ type: MatchRequestUserDto })
    fromUser: MatchRequestUserDto;

    @ApiProperty({ type: MatchRequestUserDto })
    toUser: MatchRequestUserDto;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z', nullable: true })
    respondedAt: Date | null;
}
