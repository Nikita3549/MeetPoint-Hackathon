import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { EventsService } from '../events/events.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
    let controller: UsersController;
    const usersService = {
        getMe: jest.fn(),
        getTags: jest.fn(),
        setTags: jest.fn(),
        getContacts: jest.fn(),
        setContacts: jest.fn(),
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

    it('delegates getEvents', async () => {
        eventsService.findParticipatingEvents.mockResolvedValue([]);

        await expect(controller.getEvents(user)).resolves.toEqual([]);
        expect(eventsService.findParticipatingEvents).toHaveBeenCalledWith(
            'user-1',
        );
    });

    it('delegates setTags', async () => {
        const dto = { tags: ['Go'] };
        usersService.setTags.mockResolvedValue([]);

        await expect(controller.setTags(user, dto)).resolves.toEqual([]);
        expect(usersService.setTags).toHaveBeenCalledWith(user, dto);
    });

    it('delegates setContacts', async () => {
        const dto = { contacts: [] };
        usersService.setContacts.mockResolvedValue([]);

        await expect(controller.setContacts(user, dto)).resolves.toEqual([]);
        expect(usersService.setContacts).toHaveBeenCalledWith(user, dto);
    });
});
