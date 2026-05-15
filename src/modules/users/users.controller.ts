import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JWT_AUTH_SCHEME } from '../../swagger/swagger.constants';

@ApiTags('users')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('users')
export class UsersController {}
