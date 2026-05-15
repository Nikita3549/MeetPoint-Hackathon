import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigService } from '@nestjs/config';

export async function getAdminToken(
    app: INestApplication,
): Promise<string> {
    const configService = app.get(ConfigService);
    const adminEmail = configService.getOrThrow('ADMIN_EMAIL');
    const adminPassword = configService.getOrThrow('ADMIN_PASSWORD');

    const response = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
            email: adminEmail,
            password: adminPassword,
        })
        .expect(200);

    return response.body.accessToken;
}

export async function createUserAndGetToken(
    app: INestApplication,
    userData: {
        email: string;
        password: string;
        fullName: string;
        role: string;
    },
): Promise<{ userId: string; token: string }> {
    const adminToken = await getAdminToken(app);

    // Create user via admin endpoint
    const createResponse = await request(app.getHttpServer())
        .post('/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData)
        .expect(201);

    const userId = createResponse.body.id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
            email: userData.email,
            password: userData.password,
        })
        .expect(200);

    return {
        userId,
        token: loginResponse.body.accessToken,
    };
}
