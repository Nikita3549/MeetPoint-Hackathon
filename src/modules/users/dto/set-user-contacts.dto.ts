import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { UserContactItemDto } from './user-contact-item.dto';

export class SetUserContactsDto {
    @ApiProperty({ type: [UserContactItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UserContactItemDto)
    contacts: UserContactItemDto[];
}
