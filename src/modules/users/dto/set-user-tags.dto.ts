import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetUserTagsDto {
    @ApiProperty({
        type: [String],
        example: ['frontend', 'backend'],
    })
    @IsArray()
    @IsString({ each: true })
    tags: string[];
}
