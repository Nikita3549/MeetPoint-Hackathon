import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiConflictResponse,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { JWT_AUTH_SCHEME } from '../../swagger/swagger.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateMatchRequestDto } from './dto/create-match-request.dto';
import { MatchWithoutConfirmDto } from './dto/match-without-confirm.dto';
import { MatchRequestResponseDto } from './dto/match-request-response.dto';
import { MatchResponseDto } from './dto/match-response.dto';
import { MatchRequestsService } from './match-requests.service';

@ApiTags('match-requests')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('events/:eventId')
export class MatchRequestsController {
    constructor(private readonly matchRequestsService: MatchRequestsService) {}

    @Post('match-requests')
    @ApiOperation({ summary: 'Send match request to another participant' })
    @ApiCreatedResponse({ type: MatchRequestResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiForbiddenResponse({ description: 'User is not registered for event' })
    @ApiConflictResponse({ description: 'Duplicate or already matched' })
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Body() dto: CreateMatchRequestDto,
    ): Promise<MatchRequestResponseDto> {
        return this.matchRequestsService.create(user, eventId, dto);
    }

    @Get('match-requests/incoming')
    @ApiOperation({ summary: 'List incoming pending match requests' })
    @ApiOkResponse({ type: [MatchRequestResponseDto] })
    findIncoming(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
    ): Promise<MatchRequestResponseDto[]> {
        return this.matchRequestsService.findIncoming(user, eventId);
    }

    @Get('match-requests/outgoing')
    @ApiOperation({ summary: 'List outgoing pending match requests' })
    @ApiOkResponse({ type: [MatchRequestResponseDto] })
    findOutgoing(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
    ): Promise<MatchRequestResponseDto[]> {
        return this.matchRequestsService.findOutgoing(user, eventId);
    }

    @Post('match-requests/:requestId/accept')
    @ApiOperation({ summary: 'Accept incoming match request' })
    @ApiOkResponse({ type: MatchRequestResponseDto })
    @ApiNotFoundResponse({ description: 'Match request not found' })
    @ApiConflictResponse({ description: 'Request is no longer pending' })
    accept(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Param('requestId', ParseUUIDPipe) requestId: string,
    ): Promise<MatchRequestResponseDto> {
        return this.matchRequestsService.accept(user, eventId, requestId);
    }

    @Post('match-requests/:requestId/reject')
    @ApiOperation({ summary: 'Reject incoming match request' })
    @ApiOkResponse({ type: MatchRequestResponseDto })
    @ApiNotFoundResponse({ description: 'Match request not found' })
    @ApiConflictResponse({ description: 'Request is no longer pending' })
    reject(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Param('requestId', ParseUUIDPipe) requestId: string,
    ): Promise<MatchRequestResponseDto> {
        return this.matchRequestsService.reject(user, eventId, requestId);
    }

    @Post('match-requests/instant')
    @ApiOperation({
        summary: 'Match with another participant instantly (e.g. QR scan)',
    })
    @ApiCreatedResponse({ type: MatchRequestResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiForbiddenResponse({ description: 'User is not registered for event' })
    @ApiConflictResponse({ description: 'Users are already matched' })
    matchWithoutConfirm(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
        @Body() dto: MatchWithoutConfirmDto,
    ): Promise<MatchRequestResponseDto> {
        return this.matchRequestsService.matchWithoutConfirm(
            user,
            eventId,
            dto,
        );
    }

    @Get('matches')
    @ApiOperation({ summary: 'List matched participants with contacts' })
    @ApiOkResponse({ type: [MatchResponseDto] })
    findMatches(
        @CurrentUser() user: AuthenticatedUser,
        @Param('eventId', ParseUUIDPipe) eventId: string,
    ): Promise<MatchResponseDto[]> {
        return this.matchRequestsService.findMatches(user, eventId);
    }
}
