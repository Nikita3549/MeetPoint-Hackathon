import {
    Body,
    Controller,
    Get,
    Post,
    Put,
    UploadedFile,
    UseInterceptors,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBadRequestResponse,
    ApiBody,
    ApiConflictResponse,
    ApiConsumes,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { JWT_AUTH_SCHEME } from '../../swagger/swagger.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { UserEventResponseDto } from '../events/dto/user-event-response.dto';
import { EventsService } from '../events/events.service';
import { MAX_IMAGE_SIZE_BYTES } from '../images/images.constants';
import { ValidateImageFilePipe } from '../images/pipes/validate-image-file.pipe';
import { SetUserContactsDto } from './dto/set-user-contacts.dto';
import { UserAvatarResponseDto } from './dto/user-avatar-response.dto';
import { UserContactResponseDto } from './dto/user-contact-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('users')
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly eventsService: EventsService,
    ) {}

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiOkResponse({ type: UserResponseDto })
    getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
        return this.usersService.getMe(user.id);
    }

    @Put('me')
    @UsePipes(new ValidationPipe({ whitelist: false, transform: false }))
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiBody({
        schema: {
            type: 'object',
            additionalProperties: true,
            example: {
                fullName: 'Jane Doe',
                email: 'jane@example.com',
            },
        },
    })
    @ApiOkResponse({ type: UserResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid profile fields' })
    @ApiConflictResponse({ description: 'Email already registered' })
    updateMe(
        @CurrentUser() user: AuthenticatedUser,
        @Body() body: Record<string, unknown>,
    ): Promise<UserResponseDto> {
        return this.usersService.updateMe(user, body);
    }

    @Get('me/events')
    @ApiOperation({ summary: 'List events current user participates in' })
    @ApiOkResponse({ type: [UserEventResponseDto] })
    getEvents(
        @CurrentUser() user: AuthenticatedUser,
    ): Promise<UserEventResponseDto[]> {
        return this.eventsService.findParticipatingEvents(user.id);
    }

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

    @Post('me/avatar')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
        }),
    )
    @ApiOperation({ summary: 'Upload current user avatar' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file'],
            properties: {
                file: { type: 'string', format: 'binary' },
            },
            example: { file: 'photo.jpg' },
        },
    })
    @ApiOkResponse({ type: UserAvatarResponseDto })
    @ApiBadRequestResponse({ description: 'Invalid file' })
    uploadAvatar(
        @CurrentUser() user: AuthenticatedUser,
        @UploadedFile(ValidateImageFilePipe) file: Express.Multer.File,
    ): Promise<UserAvatarResponseDto> {
        return this.usersService.uploadAvatar(user, file);
    }
}
