import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TagsService } from './tags.service';

describe('TagsService', () => {
    let service: TagsService;
    const prisma = {
        tag: {
            upsert: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TagsService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get(TagsService);
        jest.clearAllMocks();
    });

    describe('parseTagNames', () => {
        it('returns empty array for undefined', () => {
            expect(service.parseTagNames(undefined)).toEqual([]);
        });

        it('parses and deduplicates exact tag names', () => {
            expect(service.parseTagNames(' Go, Rust , Go ')).toEqual([
                'Go',
                'Rust',
            ]);
        });

        it('ignores empty segments', () => {
            expect(service.parseTagNames(' , , ')).toEqual([]);
        });
    });

    describe('resolveTagIds', () => {
        it('returns empty array for empty input', async () => {
            await expect(service.resolveTagIds([])).resolves.toEqual([]);
            expect(prisma.tag.upsert).not.toHaveBeenCalled();
        });

        it('upserts tags and returns ids', async () => {
            prisma.tag.upsert
                .mockResolvedValueOnce({ id: 'id-1', name: 'Go' })
                .mockResolvedValueOnce({ id: 'id-2', name: 'Rust' });

            await expect(
                service.resolveTagIds([' Go ', 'Rust', 'Go']),
            ).resolves.toEqual(['id-1', 'id-2']);

            expect(prisma.tag.upsert).toHaveBeenCalledTimes(2);
            expect(prisma.tag.upsert).toHaveBeenCalledWith({
                where: { name: 'Go' },
                create: { name: 'Go' },
                update: {},
            });
        });
    });
});
