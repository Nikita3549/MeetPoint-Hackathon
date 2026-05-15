import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }),
    );

    app.setGlobalPrefix('v1', {
        exclude: ['health'],
    });

    const port = process.env.API_PORT ?? process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`App is running on port ${port}`);
}
bootstrap();
