import { ApiProperty } from '@nestjs/swagger';

export class AvatarImageDto {
    @ApiProperty({
        example:
            'https://res.cloudinary.com/dj3xwdlec/image/upload/v1778925836/prod_images/5f8faa2f-d5bb-4801-824e-699d5105ec48.jpg',
    })
    url: string | null;
    @ApiProperty({ example: '839c761d-80ce-41fe-bc9f-adb5a38c8429' })
    id: string;
}
