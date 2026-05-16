import { BadRequestException } from '@nestjs/common';
import { ValidateImageFilePipe } from './validate-image-file.pipe';

describe('ValidateImageFilePipe', () => {
    const pipe = new ValidateImageFilePipe();

    const validFile = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 1024,
    } as Express.Multer.File;

    it('returns file when validation passes', async () => {
        await expect(pipe.transform(validFile)).resolves.toBe(validFile);
    });

    it('throws when file is missing', async () => {
        await expect(pipe.transform(undefined)).rejects.toThrow(
            BadRequestException,
        );
    });

    it('throws when mime type is invalid', async () => {
        await expect(
            pipe.transform({
                ...validFile,
                mimetype: 'application/pdf',
            } as Express.Multer.File),
        ).rejects.toThrow(BadRequestException);
    });
});
