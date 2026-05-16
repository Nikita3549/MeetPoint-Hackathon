import { Module } from '@nestjs/common';
import { TagsModule } from '../../common/tags/tags.module';
import { EventsModule } from '../events/events.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    imports: [TagsModule, EventsModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService],
})
export class UsersModule {}
