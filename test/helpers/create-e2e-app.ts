import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { CLOUDINARY } from '../../src/modules/images/cloudinary.provider';
import { createCloudinaryMock } from './mock-cloudinary';

export async function createE2eApp(): Promise<INestApplication> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(CLOUDINARY)
        .useValue(createCloudinaryMock())
        .compile();

    const app = moduleFixture.createNestApplication();

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

    await app.init();

    return app;
}
