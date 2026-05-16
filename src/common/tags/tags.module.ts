import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TagsService } from './tags.service';

@Module({
    imports: [PrismaModule],
    providers: [TagsService],
    exports: [TagsService],
})
export class TagsModule {}
