import { randomUUID } from 'node:crypto';
import type { UploadApiResponse } from 'cloudinary';

export function createCloudinaryMock() {
    return {
        config: () => undefined,
        uploader: {
            upload_stream: (
                _options: unknown,
                callback: (error: Error | null, result: UploadApiResponse) => void,
            ) => ({
                end: () => {
                    callback(null, {
                        secure_url: `https://res.cloudinary.com/e2e/image/upload/${randomUUID()}.jpg`,
                        public_id: `e2e/${randomUUID()}`,
                    } as UploadApiResponse);
                },
            }),
            destroy: async () => ({ result: 'ok' }),
        },
    };
}
