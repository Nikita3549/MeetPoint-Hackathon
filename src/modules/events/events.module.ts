import { Module } from '@nestjs/common';
import { TagsModule } from '../../common/tags/tags.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
    imports: [TagsModule],
    controllers: [EventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule {}
