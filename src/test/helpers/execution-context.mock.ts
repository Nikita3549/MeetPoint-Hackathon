import { ExecutionContext } from '@nestjs/common';

export function createMockExecutionContext(options: {
    user?: { id: string; email: string; role: string };
    handlerMetadata?: Map<string, unknown>;
    classMetadata?: Map<string, unknown>;
}): ExecutionContext {
    const handlerMetadata = options.handlerMetadata ?? new Map();
    const classMetadata = options.classMetadata ?? new Map();

    const handler = jest.fn();
    const controllerClass = jest.fn();

    for (const [key, value] of handlerMetadata) {
        Reflect.defineMetadata(key, value, handler);
    }

    for (const [key, value] of classMetadata) {
        Reflect.defineMetadata(key, value, controllerClass);
    }

    return {
        getHandler: () => handler,
        getClass: () => controllerClass,
        switchToHttp: () => ({
            getRequest: () => ({ user: options.user }),
        }),
    } as unknown as ExecutionContext;
}
