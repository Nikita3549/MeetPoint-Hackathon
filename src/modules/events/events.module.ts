import { Module } from '@nestjs/common';
import { ImagesModule } from '../images/images.module';
import { TagsModule } from '../../common/tags/tags.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
    imports: [ImagesModule, TagsModule],
    controllers: [EventsController],
    providers: [EventsService],
    exports: [EventsService],
})
export class EventsModule {}
