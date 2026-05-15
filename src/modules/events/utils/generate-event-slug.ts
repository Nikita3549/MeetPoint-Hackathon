import { randomInt } from 'node:crypto';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const SEGMENT_LENGTHS = [3, 4, 3] as const;

export const EVENT_SLUG_PATTERN = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export function generateEventSlug(): string {
    return SEGMENT_LENGTHS.map((length) => {
        let segment = '';
        for (let i = 0; i < length; i++) {
            segment += ALPHABET[randomInt(ALPHABET.length)];
        }
        return segment;
    }).join('-');
}
