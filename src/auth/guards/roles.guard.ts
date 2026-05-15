import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../interfaces/jwt-payload.interface';
import { getMetadataAllAndOverride } from '../utils/get-metadata';

@Injectable()
export class RolesGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = getMetadataAllAndOverride<UserRole[]>(
            ROLES_KEY,
            context,
        );

        if (!requiredRoles?.length) {
            return true;
        }

        const { user } = context
            .switchToHttp()
            .getRequest<{ user: AuthenticatedUser }>();

        if (!user || !requiredRoles.includes(user.role)) {
            throw new ForbiddenException();
        }

        return true;
    }
}
