import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';

export class UserContactResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ enum: ContactType, example: ContactType.TELEGRAM })
    type: ContactType;

    @ApiProperty({ example: '@username' })
    value: string;
}
