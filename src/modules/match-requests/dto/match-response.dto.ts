import { ApiProperty } from '@nestjs/swagger';
import { UserContactResponseDto } from '../../users/dto/user-contact-response.dto';
import { MatchRequestUserDto } from './match-request-user.dto';

export class MatchResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    matchRequestId: string;

    @ApiProperty({ type: MatchRequestUserDto })
    user: MatchRequestUserDto;

    @ApiProperty({ type: [UserContactResponseDto] })
    contacts: UserContactResponseDto[];

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    matchedAt: Date;
}
