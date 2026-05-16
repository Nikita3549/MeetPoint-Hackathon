import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TagsService {
    constructor(private readonly prisma: PrismaService) {}

    parseTagNames(raw?: string): string[] {
        if (!raw) {
            return [];
        }

        return [
            ...new Set(
                raw
                    .split(',')
                    .map((name) => name.trim())
                    .filter((name) => name.length > 0),
            ),
        ];
    }

    async resolveTagIds(tagNames: string[]): Promise<string[]> {
        const uniqueNames = [
            ...new Set(
                tagNames
                    .map((name) => name.trim())
                    .filter((name) => name.length > 0),
            ),
        ];

        if (uniqueNames.length === 0) {
            return [];
        }

        const tags = await Promise.all(
            uniqueNames.map((name) =>
                this.prisma.tag.upsert({
                    where: { name },
                    create: { name },
                    update: {},
                }),
            ),
        );

        return tags.map((tag) => tag.id);
    }
}
