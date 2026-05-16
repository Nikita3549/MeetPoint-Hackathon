import { ApiProperty } from '@nestjs/swagger';
import { EventResponseDto } from './event-response.dto';

export class UserEventResponseDto extends EventResponseDto {
    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    registeredAt: Date;
}
