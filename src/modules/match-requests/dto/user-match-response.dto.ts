import { ApiProperty } from '@nestjs/swagger';
import { MatchResponseDto } from './match-response.dto';

export class UserMatchResponseDto extends MatchResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    eventId: string;

    @ApiProperty({ example: 'Tech Conference 2026' })
    eventTitle: string;
}
