import { ApiProperty } from '@nestjs/swagger';

export class EventTagDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'frontend' })
    name: string;
}

export class EventOrganizerDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'Jane Organizer' })
    fullName: string;
}

export class EventResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({ example: 'abc-defg-hij' })
    slug: string;

    @ApiProperty({ example: 'https://meetpoint.app/e/abc-defg-hij' })
    joinUrl: string;

    @ApiProperty({ example: 'Tech Conference 2026' })
    title: string;

    @ApiProperty({ example: '2026-06-15T10:00:00.000Z' })
    date: Date;

    @ApiProperty({ example: 'Annual networking event for developers' })
    description: string;

    @ApiProperty({
        example:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/prod_images/cover.jpg',
        nullable: true,
    })
    imageUrl: string | null;

    @ApiProperty({ type: EventOrganizerDto })
    organizer: EventOrganizerDto;

    @ApiProperty({ type: [EventTagDto] })
    tags: EventTagDto[];

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    createdAt: Date;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    updatedAt: Date;
}
