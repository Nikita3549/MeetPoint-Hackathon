import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContactType, UserStatus } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { ImagesService } from '../images/images.service';
import { MatchRequestsService } from '../match-requests/match-requests.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
    let service: UsersService;
    const prisma = {
        user: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn(),
        },
        userContact: {
            findMany: jest.fn(),
            deleteMany: jest.fn(),
            createMany: jest.fn(),
        },
        $transaction: jest.fn(),
    };
    const imagesService = {
        uploadImage: jest.fn(),
        deleteImage: jest.fn(),
    };
    const eventsService = {
        findParticipatingEvents: jest.fn(),
    };
    const matchRequestsService = {
        findAllMatchesForUser: jest.fn(),
    };

    const authUser = {
        id: 'user-1',
        email: 'user@example.com',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: prisma },
                { provide: ImagesService, useValue: imagesService },
                { provide: EventsService, useValue: eventsService },
                {
                    provide: MatchRequestsService,
                    useValue: matchRequestsService,
                },
            ],
        }).compile();

        service = module.get(UsersService);
        jest.clearAllMocks();
        eventsService.findParticipatingEvents.mockResolvedValue([]);
        matchRequestsService.findAllMatchesForUser.mockResolvedValue([]);
    });

    describe('getMe', () => {
        it('returns user profile', async () => {
            const createdAt = new Date('2025-01-01');
            const updatedAt = new Date('2025-01-02');
            prisma.user.findFirst.mockResolvedValue({
                id: 'user-1',
                email: 'user@example.com',
                fullName: 'User',
                status: UserStatus.ACTIVE,
                emailVerified: true,
                emailVerifiedAt: createdAt,
                createdAt,
                updatedAt,
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
                status: UserStatus.ACTIVE,
                emailVerified: true,
                emailVerifiedAt: createdAt,
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
                events: [],
                matches: [],
            });
            expect(eventsService.findParticipatingEvents).toHaveBeenCalledWith(
                'user-1',
            );
            expect(
                matchRequestsService.findAllMatchesForUser,
            ).toHaveBeenCalledWith('user-1');
        });

        it('throws when user is not found', async () => {
            prisma.user.findFirst.mockResolvedValue(null);

            await expect(service.getMe('missing')).rejects.toThrow(
                NotFoundException,
            );
        });
    });

    describe('updateMe', () => {
        const profile = {
            id: 'user-1',
            email: 'user@example.com',
            fullName: 'User',
            status: UserStatus.ACTIVE,
            emailVerified: true,
            emailVerifiedAt: null,
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-02'),
            contacts: [],
            avatarImage: null,
            events: [],
            matches: [],
        };

        it('updates allowed fields and returns full profile', async () => {
            prisma.user.findFirst.mockResolvedValue(profile);
            prisma.user.updateMany.mockResolvedValue({ count: 1 });

            await expect(
                service.updateMe(authUser, { fullName: 'New Name' }),
            ).resolves.toEqual({
                ...profile,
                contacts: [],
            });

            expect(prisma.user.updateMany).toHaveBeenCalledWith({
                where: { id: 'user-1', deletedAt: null },
                data: { fullName: 'New Name' },
            });
        });

        it('ignores fields that have dedicated endpoints', async () => {
            prisma.user.findFirst.mockResolvedValue(profile);

            await expect(
                service.updateMe(authUser, {
                    fullName: 'Name',
                    contacts: [{ type: ContactType.EMAIL, value: 'x@y.z' }],
                    tags: ['tag-1'],
                }),
            ).resolves.toEqual({
                ...profile,
                fullName: 'User',
                contacts: [],
            });

            expect(prisma.user.updateMany).toHaveBeenCalledWith({
                where: { id: 'user-1', deletedAt: null },
                data: { fullName: 'Name' },
            });
        });

        it('skips update when body has no allowed fields', async () => {
            prisma.user.findFirst.mockResolvedValue(profile);

            await expect(
                service.updateMe(authUser, { unknownField: 'x' }),
            ).resolves.toEqual({
                ...profile,
                contacts: [],
            });

            expect(prisma.user.updateMany).not.toHaveBeenCalled();
        });

        it('throws when email is already taken', async () => {
            prisma.user.findFirst.mockResolvedValue({ id: 'other-user' });

            await expect(
                service.updateMe(authUser, { email: 'taken@example.com' }),
            ).rejects.toThrow(ConflictException);
        });

        it('throws when email is invalid', async () => {
            await expect(
                service.updateMe(authUser, { email: 'not-an-email' }),
            ).rejects.toThrow(BadRequestException);
        });

        it('throws when user is not found on update', async () => {
            prisma.user.findFirst.mockResolvedValue(null);
            prisma.user.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                service.updateMe(authUser, { fullName: 'Name' }),
            ).rejects.toThrow(NotFoundException);
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
