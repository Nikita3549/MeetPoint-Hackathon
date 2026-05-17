import { Module } from '@nestjs/common';
import { MatchRequestsController } from './match-requests.controller';
import { MatchRequestsService } from './match-requests.service';

@Module({
    controllers: [MatchRequestsController],
    providers: [MatchRequestsService],
    exports: [MatchRequestsService],
})
export class MatchRequestsModule {}
