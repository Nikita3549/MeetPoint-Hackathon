import { ConfigService } from '@nestjs/config';
import { CloudinaryProvider } from './cloudinary.provider';

const cloudinaryConfig = jest.fn();

jest.mock('cloudinary', () => ({
    v2: {
        config: (...args: unknown[]) => cloudinaryConfig(...args),
    },
}));

describe('CloudinaryProvider', () => {
    const configService = {
        getOrThrow: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        configService.getOrThrow.mockImplementation((key: string) => {
            const values: Record<string, string> = {
                CLOUDINARY_NAME: 'test-cloud',
                CLOUDINARY_KEY: 'test-key',
                CLOUDINARY_SECRET: 'test-secret',
            };

            return values[key];
        });
    });

    it('configures cloudinary from environment', () => {
        CloudinaryProvider.useFactory(configService as unknown as ConfigService);

        expect(cloudinaryConfig).toHaveBeenCalledWith({
            cloud_name: 'test-cloud',
            api_key: 'test-key',
            api_secret: 'test-secret',
        });
    });
});
