import { BadRequestException } from '@nestjs/common';
import { EventSlugPipe } from './event-slug.pipe';

describe('EventSlugPipe', () => {
    const pipe = new EventSlugPipe();

    it('normalizes valid slug', () => {
        expect(pipe.transform('  Abc-Defg-Hij  ')).toBe('abc-defg-hij');
    });

    it('throws for invalid slug', () => {
        expect(() => pipe.transform('invalid')).toThrow(BadRequestException);
    });
});
