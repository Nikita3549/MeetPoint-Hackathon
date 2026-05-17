import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { MatchRequestsController } from './match-requests.controller';
import { MatchRequestsService } from './match-requests.service';

describe('MatchRequestsController', () => {
    let controller: MatchRequestsController;
    const matchRequestsService = {
        create: jest.fn(),
        findIncoming: jest.fn(),
        findOutgoing: jest.fn(),
        accept: jest.fn(),
        reject: jest.fn(),
        findMatches: jest.fn(),
        matchWithoutConfirm: jest.fn(),
    };

    const user = {
        id: 'user-1',
        email: 'user@example.com',
        role: UserRole.PARTICIPANT,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MatchRequestsController],
            providers: [
                {
                    provide: MatchRequestsService,
                    useValue: matchRequestsService,
                },
            ],
        }).compile();

        controller = module.get(MatchRequestsController);
        jest.clearAllMocks();
    });

    it('delegates create', async () => {
        const dto = { toUserId: 'user-2' };
        matchRequestsService.create.mockResolvedValue({ id: 'req-1' });

        await expect(controller.create(user, 'event-1', dto)).resolves.toEqual({
            id: 'req-1',
        });
        expect(matchRequestsService.create).toHaveBeenCalledWith(
            user,
            'event-1',
            dto,
        );
    });

    it('delegates accept', async () => {
        matchRequestsService.accept.mockResolvedValue({ id: 'req-1' });

        await expect(
            controller.accept(user, 'event-1', 'req-1'),
        ).resolves.toEqual({ id: 'req-1' });
    });

    it('delegates findMatches', async () => {
        matchRequestsService.findMatches.mockResolvedValue([]);

        await expect(controller.findMatches(user, 'event-1')).resolves.toEqual(
            [],
        );
    });

    it('delegates findIncoming', async () => {
        matchRequestsService.findIncoming.mockResolvedValue([]);

        await expect(controller.findIncoming(user, 'event-1')).resolves.toEqual(
            [],
        );
        expect(matchRequestsService.findIncoming).toHaveBeenCalledWith(
            user,
            'event-1',
        );
    });

    it('delegates findOutgoing', async () => {
        matchRequestsService.findOutgoing.mockResolvedValue([]);

        await expect(controller.findOutgoing(user, 'event-1')).resolves.toEqual(
            [],
        );
        expect(matchRequestsService.findOutgoing).toHaveBeenCalledWith(
            user,
            'event-1',
        );
    });

    it('delegates reject', async () => {
        matchRequestsService.reject.mockResolvedValue({ id: 'req-1' });

        await expect(
            controller.reject(user, 'event-1', 'req-1'),
        ).resolves.toEqual({ id: 'req-1' });
        expect(matchRequestsService.reject).toHaveBeenCalledWith(
            user,
            'event-1',
            'req-1',
        );
    });

    it('delegates matchWithoutConfirm', async () => {
        const dto = { toUserId: 'user-2' };
        matchRequestsService.matchWithoutConfirm.mockResolvedValue({
            id: 'req-1',
            status: 'ACCEPTED',
        });

        await expect(
            controller.matchWithoutConfirm(user, 'event-1', dto),
        ).resolves.toEqual({ id: 'req-1', status: 'ACCEPTED' });
        expect(matchRequestsService.matchWithoutConfirm).toHaveBeenCalledWith(
            user,
            'event-1',
            dto,
        );
    });
});
