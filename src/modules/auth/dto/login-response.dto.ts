import { ApiProperty } from '@nestjs/swagger';
import { UserContactResponseDto } from '../../users/dto/user-contact-response.dto';

export class LoginResponseDto {
    @ApiProperty({
        example:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature',
    })
    accessToken: string;

    @ApiProperty({ example: 'Jane Doe' })
    name: string;

    @ApiProperty({ type: [UserContactResponseDto] })
    contacts: UserContactResponseDto[];
}
