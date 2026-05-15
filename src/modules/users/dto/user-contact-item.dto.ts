import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class UserContactItemDto {
    @ApiProperty({ enum: ContactType, example: ContactType.TELEGRAM })
    @IsEnum(ContactType)
    type: ContactType;

    @ApiProperty({ example: '@username' })
    @IsString()
    @MinLength(1)
    @MaxLength(255)
    value: string;
}
