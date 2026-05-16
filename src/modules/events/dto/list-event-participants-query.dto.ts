import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListEventParticipantsQueryDto {
    @ApiPropertyOptional({
        example: 'frontend,backend',
        description:
            'Comma-separated tag names. Participant must have all listed tags.',
    })
    @IsOptional()
    @IsString()
    tags?: string;
}
