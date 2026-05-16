import { createMockExecutionContext } from '../../../test/helpers/execution-context.mock';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
    const guard = new JwtAuthGuard();

    it('allows public routes without calling passport', () => {
        const context = createMockExecutionContext({
            handlerMetadata: new Map([[IS_PUBLIC_KEY, true]]),
        });
        const activateSpy = jest
            .spyOn(
                Object.getPrototypeOf(JwtAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(false);

        expect(guard.canActivate(context)).toBe(true);
        expect(activateSpy).not.toHaveBeenCalled();

        activateSpy.mockRestore();
    });

    it('delegates to passport for protected routes', () => {
        const context = createMockExecutionContext({});
        const activateSpy = jest
            .spyOn(
                Object.getPrototypeOf(JwtAuthGuard.prototype),
                'canActivate',
            )
            .mockReturnValue(true);

        expect(guard.canActivate(context)).toBe(true);
        expect(activateSpy).toHaveBeenCalledWith(context);

        activateSpy.mockRestore();
    });
});
