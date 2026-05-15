import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { getMetadataAllAndOverride } from '../utils/get-metadata';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    canActivate(context: ExecutionContext) {
        const isPublic = getMetadataAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            context,
        );

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }
}
