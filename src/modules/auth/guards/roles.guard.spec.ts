import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createMockExecutionContext } from '../../../test/helpers/execution-context.mock';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
    const guard = new RolesGuard();

    it('allows when no roles are required', () => {
        const context = createMockExecutionContext({
            user: { id: '1', email: 'a@b.c', role: UserRole.PARTICIPANT },
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('allows when user has required role', () => {
        const context = createMockExecutionContext({
            user: { id: '1', email: 'a@b.c', role: UserRole.ORGANIZER },
            handlerMetadata: new Map([[ROLES_KEY, [UserRole.ORGANIZER]]]),
        });

        expect(guard.canActivate(context)).toBe(true);
    });

    it('throws when user lacks required role', () => {
        const context = createMockExecutionContext({
            user: { id: '1', email: 'a@b.c', role: UserRole.PARTICIPANT },
            handlerMetadata: new Map([[ROLES_KEY, [UserRole.ORGANIZER]]]),
        });

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws when user is missing', () => {
        const context = createMockExecutionContext({
            handlerMetadata: new Map([[ROLES_KEY, [UserRole.ORGANIZER]]]),
        });

        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
});
