import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController', () => {
    let controller: EventsController;
    const eventsService = {
        findAll: jest.fn(),
        findBySlug: jest.fn(),
        registerBySlug: jest.fn(),
        findOne: jest.fn(),
        register: jest.fn(),
        create: jest.fn(),
        findParticipants: jest.fn(),
        getMyTags: jest.fn(),
        setMyTags: jest.fn(),
        getStats: jest.fn(),
        update: jest.fn(),
        uploadCoverImage: jest.fn(),
    };

    const user = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.ORGANIZER,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [{ provide: EventsService, useValue: eventsService }],
        }).compile();

        controller = module.get(EventsController);
        jest.clearAllMocks();
    });

    it('delegates findAll', async () => {
        eventsService.findAll.mockResolvedValue([]);

        await expect(controller.findAll()).resolves.toEqual([]);
    });

    it('delegates findBySlug', async () => {
        eventsService.findBySlug.mockResolvedValue({ id: 'event-1' });

        await expect(controller.findBySlug('abc-defg-hij')).resolves.toEqual({
            id: 'event-1',
        });
        expect(eventsService.findBySlug).toHaveBeenCalledWith('abc-defg-hij');
    });

    it('delegates create', async () => {
        const dto = {
            title: 'Meetup',
            date: '2025-06-01',
            description: 'Desc',
            tags: [],
        };
        eventsService.create.mockResolvedValue({ id: 'event-1' });

        await expect(controller.create(user, dto)).resolves.toEqual({
            id: 'event-1',
        });
        expect(eventsService.create).toHaveBeenCalledWith(user, dto);
    });

    it('delegates setMyTags', async () => {
        const dto = { tags: ['Go'] };
        eventsService.setMyTags.mockResolvedValue([]);

        await expect(
            controller.setMyTags(user, 'event-1', dto),
        ).resolves.toEqual([]);
        expect(eventsService.setMyTags).toHaveBeenCalledWith(
            user,
            'event-1',
            dto,
        );
    });

    it('delegates getMyTags', async () => {
        eventsService.getMyTags.mockResolvedValue([]);

        await expect(controller.getMyTags(user, 'event-1')).resolves.toEqual(
            [],
        );
        expect(eventsService.getMyTags).toHaveBeenCalledWith(user, 'event-1');
    });

    it('delegates findParticipants with query tags', async () => {
        eventsService.findParticipants.mockResolvedValue([]);

        await expect(
            controller.findParticipants(user, 'event-1', { tags: 'Go' }),
        ).resolves.toEqual([]);
        expect(eventsService.findParticipants).toHaveBeenCalledWith(
            user,
            'event-1',
            'Go',
        );
    });

    it('delegates uploadCoverImage', async () => {
        const file = { originalname: 'cover.jpg' } as Express.Multer.File;
        eventsService.uploadCoverImage.mockResolvedValue({ id: 'event-1' });

        await expect(
            controller.uploadCoverImage(user, 'event-1', file),
        ).resolves.toEqual({ id: 'event-1' });
        expect(eventsService.uploadCoverImage).toHaveBeenCalledWith(
            user,
            'event-1',
            file,
        );
    });
});
