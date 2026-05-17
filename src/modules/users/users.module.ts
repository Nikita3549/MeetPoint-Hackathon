import { Module } from '@nestjs/common';
import { ImagesModule } from '../images/images.module';
import { EventsModule } from '../events/events.module';
import { MatchRequestsModule } from '../match-requests/match-requests.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    imports: [EventsModule, MatchRequestsModule, ImagesModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
