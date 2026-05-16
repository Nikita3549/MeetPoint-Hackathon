import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class SetParticipantTagsDto {
    @ApiProperty({
        type: [String],
        example: ['frontend', 'backend'],
    })
    @IsArray()
    @IsString({ each: true })
    tags: string[];
}
