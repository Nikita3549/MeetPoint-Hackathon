import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMinSize,
    IsArray,
    IsDateString,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';

export class UpdateEventDto {
    @ApiPropertyOptional({ example: 'Tech Conference 2026' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    title?: string;

    @ApiPropertyOptional({ example: '2026-06-15T10:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    date?: string;

    @ApiPropertyOptional({ example: 'Annual networking event for developers' })
    @IsOptional()
    @IsString()
    @MinLength(1)
    description?: string;

    @ApiPropertyOptional({
        example: ['frontend', 'backend', 'AI'],
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    @MinLength(1, { each: true })
    tags?: string[];
}
