import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, MinLength, ValidateNested } from 'class-validator';
import { UserContactItemDto } from '../../users/dto/user-contact-item.dto';

export class RegisterDto {
    @ApiProperty({ example: 'johndoe' })
    @IsString()
    @MinLength(1)
    username: string;

    @ApiProperty({ type: [UserContactItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserContactItemDto)
    contacts: UserContactItemDto[];
}
