import { createMockExecutionContext } from '../../../test/helpers/execution-context.mock';
import { getMetadataAllAndOverride } from './get-metadata';

const METADATA_KEY = 'test:key';

describe('getMetadataAllAndOverride', () => {
    it('returns handler metadata when defined', () => {
        const context = createMockExecutionContext({
            handlerMetadata: new Map([[METADATA_KEY, 'handler']]),
            classMetadata: new Map([[METADATA_KEY, 'class']]),
        });

        expect(
            getMetadataAllAndOverride<string>(METADATA_KEY, context),
        ).toBe('handler');
    });

    it('falls back to class metadata', () => {
        const context = createMockExecutionContext({
            classMetadata: new Map([[METADATA_KEY, 'class']]),
        });

        expect(
            getMetadataAllAndOverride<string>(METADATA_KEY, context),
        ).toBe('class');
    });

    it('returns undefined when metadata is missing', () => {
        const context = createMockExecutionContext({});

        expect(
            getMetadataAllAndOverride<string>(METADATA_KEY, context),
        ).toBeUndefined();
    });
});
