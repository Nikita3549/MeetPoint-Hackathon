import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsString,
    MinLength,
} from 'class-validator';

export class CreateEventDto {
    @ApiProperty({ example: 'Tech Conference 2026' })
    @IsString()
    @MinLength(1)
    title: string;

    @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
    @IsDateString()
    date: string;

    @ApiProperty({ example: 'Annual networking event for developers' })
    @IsString()
    @MinLength(1)
    description: string;

    @ApiProperty({
        example: ['frontend', 'backend', 'AI'],
        type: [String],
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    @MinLength(1, { each: true })
    tags: string[];
}
