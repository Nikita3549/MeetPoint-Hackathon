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
});
