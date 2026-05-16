import { InternalServerErrorException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CLOUDINARY } from './cloudinary.provider';
import { ImagesService } from './images.service';

describe('ImagesService', () => {
    let service: ImagesService;
    const prisma = {
        image: {
            create: jest.fn(),
            findUnique: jest.fn(),
            delete: jest.fn(),
        },
    };
    const cloudinary = {
        uploader: {
            upload_stream: jest.fn(),
            destroy: jest.fn(),
        },
    };

    const file = {
        originalname: 'photo.png',
        mimetype: 'image/png',
        size: 128,
        buffer: Buffer.from('image'),
    } as Express.Multer.File;

    const imageRecord = {
        id: 'image-1',
        url: 'https://res.cloudinary.com/demo/image/upload/photo.png',
        cloudinaryPublicId: 'prod_images/uuid',
        originalFileName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 128,
        createdAt: new Date('2025-01-01'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ImagesService,
                { provide: PrismaService, useValue: prisma },
                { provide: CLOUDINARY, useValue: cloudinary },
            ],
        }).compile();

        service = module.get(ImagesService);
        jest.clearAllMocks();
    });

    it('uploads image to cloudinary and saves record', async () => {
        cloudinary.uploader.upload_stream.mockImplementation(
            (_options, callback) => ({
                end: () => {
                    callback(null, {
                        secure_url: imageRecord.url,
                        public_id: imageRecord.cloudinaryPublicId,
                    });
                },
            }),
        );
        prisma.image.create.mockResolvedValue(imageRecord);

        await expect(service.uploadImage('user-1', file)).resolves.toEqual({
            id: imageRecord.id,
            url: imageRecord.url,
            cloudinaryPublicId: imageRecord.cloudinaryPublicId,
            originalFileName: imageRecord.originalFileName,
            mimeType: imageRecord.mimeType,
            sizeBytes: imageRecord.sizeBytes,
            createdAt: imageRecord.createdAt,
        });

        expect(prisma.image.create).toHaveBeenCalledWith({
            data: {
                url: imageRecord.url,
                cloudinaryPublicId: imageRecord.cloudinaryPublicId,
                originalFileName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                uploadedById: 'user-1',
            },
        });
    });

    it('throws when cloudinary upload fails', async () => {
        cloudinary.uploader.upload_stream.mockImplementation(
            (_options, callback) => ({
                end: () => {
                    callback(new Error('upload failed'), undefined);
                },
            }),
        );

        await expect(service.uploadImage('user-1', file)).rejects.toThrow(
            'upload failed',
        );
    });

    it('throws InternalServerErrorException when cloudinary returns empty result', async () => {
        cloudinary.uploader.upload_stream.mockImplementation(
            (_options, callback) => ({
                end: () => {
                    callback(null, undefined);
                },
            }),
        );

        await expect(
            service.uploadImage('user-1', file),
        ).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('deleteImage does nothing when image is missing', async () => {
        prisma.image.findUnique.mockResolvedValue(null);

        await service.deleteImage('missing');

        expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
        expect(prisma.image.delete).not.toHaveBeenCalled();
    });

    it('deleteImage removes image from cloudinary and database', async () => {
        prisma.image.findUnique.mockResolvedValue({
            id: 'image-1',
            cloudinaryPublicId: 'prod_images/uuid',
        });

        await service.deleteImage('image-1');

        expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
            'prod_images/uuid',
        );
        expect(prisma.image.delete).toHaveBeenCalledWith({
            where: { id: 'image-1' },
        });
    });
});
