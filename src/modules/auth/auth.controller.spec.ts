import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let controller: AuthController;
    const authService = {
        login: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AuthService, useValue: authService }],
        }).compile();

        controller = module.get(AuthController);
        jest.clearAllMocks();
    });

    it('delegates login to service', async () => {
        const dto = { email: 'user@example.com', password: 'secret' };
        const response = { accessToken: 'token' };
        authService.login.mockResolvedValue(response);

        await expect(controller.login(dto)).resolves.toBe(response);
        expect(authService.login).toHaveBeenCalledWith(dto);
    });
});
