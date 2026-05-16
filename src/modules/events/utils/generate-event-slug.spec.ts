import {
    EVENT_SLUG_PATTERN,
    generateEventSlug,
} from './generate-event-slug';

describe('generateEventSlug', () => {
    it('returns slug matching pattern', () => {
        const slug = generateEventSlug();

        expect(EVENT_SLUG_PATTERN.test(slug)).toBe(true);
    });

    it('generates different slugs', () => {
        const slugs = new Set(
            Array.from({ length: 20 }, () => generateEventSlug()),
        );

        expect(slugs.size).toBeGreaterThan(1);
    });
});
