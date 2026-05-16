import { ApiProperty } from '@nestjs/swagger';

export class EventStatsResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    eventId: string;

    @ApiProperty({ example: 42 })
    participantsRegistered: number;

    @ApiProperty({ example: 18 })
    matchRequestsSent: number;

    @ApiProperty({ example: 7 })
    matchRequestsAccepted: number;

    @ApiProperty({ example: 7 })
    acquaintancesMade: number;
}
