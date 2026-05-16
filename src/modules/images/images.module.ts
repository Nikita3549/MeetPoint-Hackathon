import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryProvider } from './cloudinary.provider';
import { MAX_IMAGE_SIZE_BYTES } from './images.constants';
import { ImagesService } from './images.service';
import { ValidateImageFilePipe } from './pipes/validate-image-file.pipe';

@Module({
    imports: [
        ConfigModule,
        MulterModule.register({
            limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
        }),
    ],
    providers: [ImagesService, CloudinaryProvider, ValidateImageFilePipe],
    exports: [ImagesService, ValidateImageFilePipe, MulterModule],
})
export class ImagesModule {}
