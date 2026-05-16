import { ApiProperty } from '@nestjs/swagger';

export class UserAvatarResponseDto {
    @ApiProperty({
        example:
            'https://res.cloudinary.com/demo/image/upload/v1234567890/prod_images/photo.jpg',
    })
    avatarUrl: string;
}
