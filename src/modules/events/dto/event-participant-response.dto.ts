import { ApiProperty } from '@nestjs/swagger';
import { TagResponseDto } from '../../../common/dto/tag-response.dto';

export class EventParticipantResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    userId: string;

    @ApiProperty({ example: 'Alice Smith' })
    fullName: string;

    @ApiProperty({ type: [TagResponseDto] })
    tags: TagResponseDto[];

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    registeredAt: Date;
}
