import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { SWAGGER_PATH } from './swagger.constants';

function loadOpenApiDocument(): OpenAPIObject {
    const candidates = [
        join(process.cwd(), 'src', 'swagger', 'openapi.json'),
        join(__dirname, 'openapi.json'),
        join(__dirname, '..', '..', 'swagger', 'openapi.json'),
        join(process.cwd(), 'dist', 'swagger', 'openapi.json'),
    ];

    for (const path of candidates) {
        if (existsSync(path)) {
            return JSON.parse(readFileSync(path, 'utf8')) as OpenAPIObject;
        }
    }

    throw new Error('openapi.json not found');
}

export function setupSwagger(app: INestApplication): void {
    const document = loadOpenApiDocument();

    SwaggerModule.setup(SWAGGER_PATH, app, document, {
        swaggerOptions: {
            persistAuthorization: true,
        },
    });
}
