import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { JWT_AUTH_SCHEME, SWAGGER_PATH } from './swagger.constants';

export function setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
        .setTitle('Hackaton Prod API')
        .setDescription('Backend API')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            JWT_AUTH_SCHEME,
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup(SWAGGER_PATH, app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
}
