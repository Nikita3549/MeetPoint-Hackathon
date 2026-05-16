import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContactType, UserRole, UserStatus } from '@prisma/client';
import { TagsService } from '../../common/tags/tags.service';
import { ImagesService } from '../images/images.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    const prisma = {
        user: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        userContact: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const tagsService = {
        resolveTagIds: jest.fn(),
    };
    const imagesService = {
        uploadImage: jest.fn(),
        deleteImage: jest.fn(),
    };

    const authUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.PARTICIPANT,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: prisma },
                { provide: TagsService, useValue: tagsService },
                { provide: ImagesService, useValue: imagesService },
            ],
        }).compile();

        service = module.get(UsersService);
        jest.clearAllMocks();
    });

    describe('getMe', () => {
        it('returns user profile', async () => {
            const createdAt = new Date('2025-01-01');
            const updatedAt = new Date('2025-01-02');
            prisma.user.findFirst.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                fullName: 'User',
                role: UserRole.PARTICIPANT,
                status: UserStatus.ACTIVE,
                emailVerified: true,
                emailVerifiedAt: createdAt,
                createdAt,
                updatedAt,
                tags: [{ id: 'tag-1', name: 'Go' }],
                contacts: [
                    {
                        id: 'contact-1',
                        type: ContactType.TELEGRAM,
                        value: '@user',
                        createdAt,
                        updatedAt,
                    },
                ],
            });

            await expect(service.getMe('user-1')).resolves.toEqual({
                id: 'user-1',
                email: 'user@example.com',
                fullName: 'User',
                role: UserRole.PARTICIPANT,
                status: UserStatus.ACTIVE,
                emailVerified: true,
                emailVerifiedAt: createdAt,
                tags: [{ id: 'tag-1', name: 'Go' }],
                contacts: [
                    {
                        id: 'contact-1',
                        type: ContactType.TELEGRAM,
                        value: '@user',
                    },
                ],
                avatarImage: null,
                createdAt,
                updatedAt,
            });
        });

        it('throws when user is not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(service.getMe('missing')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('getTags', () => {
        it('returns tags for user', async () => {
            prisma.user.findUnique.mockResolvedValue({
                tags: [{ id: 'tag-1', name: 'Go' }],
            });

            await expect(service.getTags('user-1')).resolves.toEqual([
                { id: 'tag-1', name: 'Go' },
            ]);
        });

        it('returns empty array when user is missing', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.getTags('missing')).resolves.toEqual([]);
        });
    });

    describe('setTags', () => {
        it('updates user tags', async () => {
            tagsService.resolveTagIds.mockResolvedValue(['tag-1']);
            prisma.user.update.mockResolvedValue({
                tags: [{ id: 'tag-1', name: 'Go' }],
            });

            await expect(
                service.setTags(authUser, { tags: ['Go'] }),
            ).resolves.toEqual([{ id: 'tag-1', name: 'Go' }]);
        });
    });

    describe('getContacts', () => {
        it('returns user contacts', async () => {
            const createdAt = new Date();
            const updatedAt = new Date();
            prisma.userContact.findMany.mockResolvedValue([
                {
                    id: 'contact-1',
                    type: ContactType.EMAIL,
                    value: 'user@example.com',
                    createdAt,
                    updatedAt,
                },
            ]);

            await expect(service.getContacts('user-1')).resolves.toEqual([
                {
                    id: 'contact-1',
                    type: ContactType.EMAIL,
                    value: 'user@example.com',
                },
            ]);
        });
    });

    describe('setContacts', () => {
        it('replaces contacts and deduplicates values', async () => {
            const createdAt = new Date();
            const updatedAt = new Date();
            const tx = {
                userContact: {
                    deleteMany: jest.fn(),
                    createMany: jest.fn(),
                    findMany: jest.fn().mockResolvedValue([
                        {
                            id: 'contact-1',
                            type: ContactType.TELEGRAM,
                            value: '@user',
                            createdAt,
                            updatedAt,
                        },
                    ]),
                },
            };
            prisma.$transaction.mockImplementation(
                async (callback: (client: typeof tx) => Promise<unknown>) =>
                    callback(tx),
            );

            await expect(
                service.setContacts(authUser, {
                    contacts: [
                        {
                            type: ContactType.TELEGRAM,
                            value: ' @user ',
                        },
                        {
                            type: ContactType.TELEGRAM,
                            value: '@USER',
                        },
                        {
                            type: ContactType.EMAIL,
                            value: '   ',
                        },
                    ],
                }),
            ).resolves.toEqual([
                {
                    id: 'contact-1',
                    type: ContactType.TELEGRAM,
                    value: '@user',
                },
            ]);

            expect(tx.userContact.createMany).toHaveBeenCalledWith({
                data: [
                    {
                        userId: 'user-1',
                        type: ContactType.TELEGRAM,
                        value: '@user',
                    },
                ],
            });
        });

        it('clears contacts when list is empty after normalization', async () => {
            const tx = {
                userContact: {
                    deleteMany: jest.fn(),
                    createMany: jest.fn(),
                    findMany: jest.fn(),
                },
            };
            prisma.$transaction.mockImplementation(
                async (callback: (client: typeof tx) => Promise<unknown>) =>
                    callback(tx),
            );

            await expect(
                service.setContacts(authUser, {
                    contacts: [{ type: ContactType.EMAIL, value: '   ' }],
                }),
            ).resolves.toEqual([]);

            expect(tx.userContact.createMany).not.toHaveBeenCalled();
        });
    });

    describe('uploadAvatar', () => {
        const file = {
            originalname: 'avatar.jpg',
            mimetype: 'image/jpeg',
            size: 512,
        } as Express.Multer.File;

        it('uploads avatar and links image to user', async () => {
            prisma.user.findUnique.mockResolvedValue({ avatarImageId: null });
            imagesService.uploadImage.mockResolvedValue({
                id: 'img-1',
                url: 'https://cdn.example/avatar.jpg',
            });

            await expect(service.uploadAvatar(authUser, file)).resolves.toEqual(
                {
                    avatarUrl: 'https://cdn.example/avatar.jpg',
                },
            );

            expect(imagesService.uploadImage).toHaveBeenCalledWith(
                'user-1',
                file,
            );
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'user-1' },
                data: { avatarImageId: 'img-1' },
            });
            expect(imagesService.deleteImage).not.toHaveBeenCalled();
        });

        it('deletes previous avatar when replacing', async () => {
            prisma.user.findUnique.mockResolvedValue({
                avatarImageId: 'old-img',
            });
            imagesService.uploadImage.mockResolvedValue({
                id: 'img-2',
                url: 'https://cdn.example/new-avatar.jpg',
            });

            await expect(service.uploadAvatar(authUser, file)).resolves.toEqual(
                {
                    avatarUrl: 'https://cdn.example/new-avatar.jpg',
                },
            );

            expect(imagesService.deleteImage).toHaveBeenCalledWith('old-img');
        });
    });
});
