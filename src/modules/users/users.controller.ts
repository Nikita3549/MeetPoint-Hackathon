import { Body, Controller, Get, Put } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBadRequestResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { JWT_AUTH_SCHEME } from '../../swagger/swagger.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { SetUserContactsDto } from './dto/set-user-contacts.dto';
import { UserContactResponseDto } from './dto/user-contact-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('me/contacts')
    @ApiOperation({ summary: 'List current user contacts' })
    @ApiOkResponse({ type: [UserContactResponseDto] })
    getContacts(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<UserContactResponseDto[]> {
        return this.usersService.getContacts(user.id);
    }

    @Put('me/contacts')
    @ApiOperation({ summary: 'Set current user contacts' })
    @ApiOkResponse({ type: [UserContactResponseDto] })
    @ApiBadRequestResponse({ description: 'Invalid contacts' })
    setContacts(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: SetUserContactsDto,
    ): Promise<UserContactResponseDto[]> {
        return this.usersService.setContacts(user, dto);
    }
}
