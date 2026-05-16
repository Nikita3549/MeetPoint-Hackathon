import { ApiProperty } from '@nestjs/swagger';

export class ImageResponseDto {
    @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    id: string;

    @ApiProperty({
        example:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/prod_images/photo.jpg',
    })
    url: string;

    @ApiProperty({ example: 'prod_images/a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    cloudinaryPublicId: string;

    @ApiProperty({ example: 'photo.jpg', nullable: true })
    originalFileName: string | null;

    @ApiProperty({ example: 'image/jpeg', nullable: true })
    mimeType: string | null;

    @ApiProperty({ example: 102400, nullable: true })
    sizeBytes: number | null;

    @ApiProperty({ example: '2026-05-15T12:00:00.000Z' })
    createdAt: Date;
}
