import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    const usersService = {
        getMe: jest.fn(),
        updateMe: jest.fn(),
        getContacts: jest.fn(),
        setContacts: jest.fn(),
        uploadAvatar: jest.fn(),
    };
    const eventsService = {
        findParticipatingEvents: jest.fn(),
    };

    const user = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.PARTICIPANT,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                { provide: UsersService, useValue: usersService },
                { provide: EventsService, useValue: eventsService },
            ],
        }).compile();

        controller = module.get(UsersController);
        jest.clearAllMocks();
    });

    it('delegates getMe', async () => {
        usersService.getMe.mockResolvedValue({ id: 'user-1' });

        await expect(controller.getMe(user)).resolves.toEqual({ id: 'user-1' });
        expect(usersService.getMe).toHaveBeenCalledWith('user-1');
    });

    it('delegates updateMe', async () => {
        const body = { fullName: 'Jane Doe' };
        usersService.updateMe.mockResolvedValue({ id: 'user-1' });

        await expect(controller.updateMe(user, body)).resolves.toEqual({
            id: 'user-1',
        });
        expect(usersService.updateMe).toHaveBeenCalledWith(user, body);
    });

    it('delegates getEvents', async () => {
        eventsService.findParticipatingEvents.mockResolvedValue([]);

        await expect(controller.getEvents(user)).resolves.toEqual([]);
        expect(eventsService.findParticipatingEvents).toHaveBeenCalledWith(
            'user-1',
        );
    });

    it('delegates setContacts', async () => {
        const dto = { contacts: [] };
        usersService.setContacts.mockResolvedValue([]);

        await expect(controller.setContacts(user, dto)).resolves.toEqual([]);
        expect(usersService.setContacts).toHaveBeenCalledWith(user, dto);
    });

    it('delegates getContacts', async () => {
        usersService.getContacts.mockResolvedValue([]);

        await expect(controller.getContacts(user)).resolves.toEqual([]);
        expect(usersService.getContacts).toHaveBeenCalledWith('user-1');
    });

    it('delegates uploadAvatar', async () => {
        const file = { originalname: 'avatar.jpg' } as Express.Multer.File;
        usersService.uploadAvatar.mockResolvedValue({
            avatarUrl: 'https://cdn.example/avatar.jpg',
        });

        await expect(controller.uploadAvatar(user, file)).resolves.toEqual({
            avatarUrl: 'https://cdn.example/avatar.jpg',
        });
        expect(usersService.uploadAvatar).toHaveBeenCalledWith(user, file);
    });
});
