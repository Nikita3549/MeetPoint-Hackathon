import { ApiProperty } from '@nestjs/swagger';

export class EventRegistrationResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    eventId: string;

    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    userId: string;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    registeredAt: Date;
}
