import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { EVENT_SLUG_PATTERN } from '../utils/generate-event-slug';

@Injectable()
export class EventSlugPipe implements PipeTransform<string, string> {
    transform(value: string): string {
        const slug = value.trim().toLowerCase();

        if (!EVENT_SLUG_PATTERN.test(slug)) {
            throw new BadRequestException('Invalid event link code');
        }

        return slug;
    }
}
