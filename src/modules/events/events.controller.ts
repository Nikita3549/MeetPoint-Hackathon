import {
    Body,
    Controller,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JWT_AUTH_SCHEME } from '../../swagger/swagger.constants';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/interfaces/jwt-payload.interface';
import { CreateEventDto } from './dto/create-event.dto';
import { EventParticipantResponseDto } from './dto/event-participant-response.dto';
import { EventRegistrationResponseDto } from './dto/event-registration-response.dto';
import { EventResponseDto } from './dto/event-response.dto';
import { EventStatsResponseDto } from './dto/event-stats-response.dto';
import { ListEventParticipantsQueryDto } from './dto/list-event-participants-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventSlugPipe } from './pipes/event-slug.pipe';
import { EventsService } from './events.service';

@ApiTags('events')
@ApiBearerAuth(JWT_AUTH_SCHEME)
@Controller('events')
export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    @ApiOperation({ summary: 'List all events' })
    @ApiOkResponse({ type: [EventResponseDto] })
    findAll(): Promise<EventResponseDto[]> {
        return this.eventsService.findAll();
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get event by join link code' })
    @ApiOkResponse({ type: EventResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    findBySlug(
        @Param('slug', EventSlugPipe) slug: string,
    ): Promise<EventResponseDto> {
        return this.eventsService.findBySlug(slug);
    }

    @Post('slug/:slug/register')
    @ApiOperation({ summary: 'Register for event by join link code' })
    @ApiCreatedResponse({ type: EventRegistrationResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    registerBySlug(
        @CurrentUser() user: AuthenticatedUser,
        @Param('slug', EventSlugPipe) slug: string,
    ): Promise<EventRegistrationResponseDto> {
        return this.eventsService.registerBySlug(user, slug);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get event by id' })
    @ApiOkResponse({ type: EventResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EventResponseDto> {
        return this.eventsService.findOne(id);
    }

    @Post(':id/register')
    @ApiOperation({ summary: 'Register for event' })
    @ApiCreatedResponse({ type: EventRegistrationResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    register(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<EventRegistrationResponseDto> {
        return this.eventsService.register(user, id);
    }

    @Post()
    @Roles(UserRole.ORGANIZER)
    @ApiOperation({ summary: 'Create event' })
    @ApiCreatedResponse({ type: EventResponseDto })
    @ApiForbiddenResponse({ description: 'Organizer role required' })
    create(
        @CurrentUser() user: AuthenticatedUser,
        @Body() dto: CreateEventDto,
    ): Promise<EventResponseDto> {
        return this.eventsService.create(user, dto);
    }

    @Get(':id/participants')
    @ApiOperation({ summary: 'List event participants' })
    @ApiOkResponse({ type: [EventParticipantResponseDto] })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiForbiddenResponse({ description: 'User is not registered for event' })
    findParticipants(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: ListEventParticipantsQueryDto,
    ): Promise<EventParticipantResponseDto[]> {
        return this.eventsService.findParticipants(user, id, query.tags);
    }

    @Get(':id/stats')
    @Roles(UserRole.ORGANIZER)
    @ApiOperation({ summary: 'Get event statistics for organizer' })
    @ApiOkResponse({ type: EventStatsResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiForbiddenResponse({
        description: 'Organizer role required or not event owner',
    })
    getStats(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
    ): Promise<EventStatsResponseDto> {
        return this.eventsService.getStats(user, id);
    }

    @Put(':id')
    @Roles(UserRole.ORGANIZER)
    @ApiOperation({ summary: 'Update event' })
    @ApiOkResponse({ type: EventResponseDto })
    @ApiNotFoundResponse({ description: 'Event not found' })
    @ApiForbiddenResponse({
        description: 'Organizer role required or not event owner',
    })
    update(
        @CurrentUser() user: AuthenticatedUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateEventDto,
    ): Promise<EventResponseDto> {
        return this.eventsService.update(user, id, dto);
    }
}
