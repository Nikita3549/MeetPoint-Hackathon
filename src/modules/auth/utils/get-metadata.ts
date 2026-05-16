import { ExecutionContext } from '@nestjs/common';

export function getMetadataAllAndOverride<T>(
    key: string,
    context: ExecutionContext,
): T | undefined {
    const handlerValue = Reflect.getMetadata(key, context.getHandler()) as
        | T
        | undefined;
    if (handlerValue !== undefined) {
        return handlerValue;
    }

    return Reflect.getMetadata(key, context.getClass()) as T | undefined;
}
