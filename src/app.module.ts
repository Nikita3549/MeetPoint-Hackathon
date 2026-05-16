import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventsModule } from './modules/events/events.module';
import { MatchRequestsModule } from './modules/match-requests/match-requests.module';
import { UsersModule } from './modules/users/users.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        AuthModule,
        UsersModule,
        EventsModule,
        MatchRequestsModule,
    ],
    controllers: [AppController],
})
export class AppModule {}
