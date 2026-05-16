import 'reflect-metadata';
import { loadE2eEnv } from './helpers/load-env';

loadE2eEnv();

process.env.JWT_SECRET ??= 'e2e-jwt-secret';
process.env.JWT_EXPIRES_IN ??= '1h';
process.env.APP_PUBLIC_URL ??= 'https://app.test';
