import { ContactType, MatchRequestStatus, PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { truncateDatabase } from '../test/helpers/database';
import {
    SEED_MATCH_REQUEST_ID,
    SEED_PASSWORD,
    SEED_USER_ID,
} from './seed.constants';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = SEED_PASSWORD;
const BCRYPT_ROUNDS = 10;

const USERS = [
    {
        email: 'user1@example.com',
        fullName: 'Иван Петров',
        contacts: [
            { type: ContactType.TELEGRAM, value: '@ivan_petrov' },
            { type: ContactType.PHONE, value: '+79001234501' },
        ],
        avatar: {
            url: 'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/sample.jpg',
            cloudinaryPublicId: 'seed/avatar-ivan-petrov',
            originalFileName: 'ivan-petrov.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 128_000,
        },
    },
    {
        email: 'user2@example.com',
        fullName: 'Мария Козлова',
        contacts: [
            { type: ContactType.TELEGRAM, value: '@maria_kozlova' },
            { type: ContactType.EMAIL, value: 'user2@example.com' },
        ],
        avatar: {
            url: 'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill/coffee.jpg',
            cloudinaryPublicId: 'seed/avatar-maria-kozlova',
            originalFileName: 'maria-kozlova.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 142_000,
        },
    },
    {
        email: 'user3@example.com',
        fullName: 'Алексей Смирнов',
        contacts: [{ type: ContactType.VK, value: 'vk.com/alexey_smirnov' }],
    },
    {
        email: 'user4@example.com',
        fullName: 'Елена Новикова',
        contacts: [
            { type: ContactType.TELEGRAM, value: '@elena_novikova' },
            {
                type: ContactType.LINKEDIN,
                value: 'linkedin.com/in/elena-novikova',
            },
        ],
    },
    {
        email: 'user5@example.com',
        fullName: 'Павел Морозов',
        contacts: [{ type: ContactType.TELEGRAM, value: '@pavel_morozov' }],
    },
    {
        email: 'user6@example.com',
        fullName: 'Ольга Лебедева',
        contacts: [{ type: ContactType.EMAIL, value: 'user6@example.com' }],
    },
    {
        email: 'user7@example.com',
        fullName: 'Никита Орлов',
        contacts: [{ type: ContactType.TELEGRAM, value: '@nikita_orlov' }],
    },
    {
        email: 'user8@example.com',
        fullName: 'София Волкова',
        contacts: [{ type: ContactType.PHONE, value: '+79001234508' }],
    },
    { email: 'user9@example.com', fullName: 'Артём Зайцев', contacts: [] },
    {
        email: 'user10@example.com',
        fullName: 'Дарья Соколова',
        contacts: [{ type: ContactType.TELEGRAM, value: '@darya_sokolova' }],
    },
    { email: 'user11@example.com', fullName: 'Максим Кузнецов', contacts: [] },
    {
        email: 'user12@example.com',
        fullName: 'Виктория Белова',
        contacts: [{ type: ContactType.EMAIL, value: 'user12@example.com' }],
    },
    { email: 'user13@example.com', fullName: 'Георгий Попов', contacts: [] },
    { email: 'user14@example.com', fullName: 'Алина Фёдорова', contacts: [] },
    { email: 'user15@example.com', fullName: 'Кирилл Медведев', contacts: [] },
    { email: 'user16@example.com', fullName: 'Полина Романова', contacts: [] },
    { email: 'user17@example.com', fullName: 'Роман Егоров', contacts: [] },
    { email: 'user18@example.com', fullName: 'Юлия Тихонова', contacts: [] },
] as const;

const EVENTS = [
    {
        slug: 'bkd-mtup-jun',
        title: 'Backend & DevOps Meetup',
        date: new Date('2026-06-20T18:00:00.000Z'),
        description:
            'Вечерняя встреча разработчиков: доклады про NestJS и Kubernetes, нетворкинг и поиск команды на хакатон. Регистрация открыта всем участникам.',
        isPrivate: false,
        creatorEmail: 'user1@example.com',
        tags: ['backend', 'devops', 'networking'],
        cover: {
            url: 'https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_fill/balloons.jpg',
            cloudinaryPublicId: 'seed/cover-backend-meetup',
            originalFileName: 'backend-meetup-cover.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 256_000,
        },
        participants: [
            { email: 'user1@example.com', tags: ['backend', 'nodejs'] },
            { email: 'user2@example.com', tags: ['backend', 'postgres'] },
            { email: 'user3@example.com', tags: ['devops', 'kubernetes'] },
            { email: 'user4@example.com', tags: ['backend', 'ai'] },
            { email: 'user5@example.com', tags: ['devops', 'ci-cd'] },
            { email: 'user6@example.com', tags: ['backend', 'typescript'] },
            { email: 'user7@example.com', tags: ['networking'] },
            { email: 'user8@example.com', tags: ['backend', 'nestjs'] },
        ],
        matchRequests: [
            {
                from: 'user2@example.com',
                to: 'user1@example.com',
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2026-05-10T12:00:00.000Z'),
            },
            {
                id: SEED_MATCH_REQUEST_ID.acceptUser3ToUser4,
                from: 'user3@example.com',
                to: 'user4@example.com',
                status: MatchRequestStatus.PENDING,
            },
            {
                id: SEED_MATCH_REQUEST_ID.rejectUser7ToUser8,
                from: 'user7@example.com',
                to: 'user8@example.com',
                status: MatchRequestStatus.PENDING,
            },
            {
                from: 'user5@example.com',
                to: 'user1@example.com',
                status: MatchRequestStatus.REJECTED,
                respondedAt: new Date('2026-05-11T09:30:00.000Z'),
            },
            {
                from: 'user4@example.com',
                to: 'user2@example.com',
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2026-05-12T14:15:00.000Z'),
            },
        ],
    },
    {
        slug: 'dsn-wksh-may',
        title: 'Product Design Workshop',
        date: new Date('2026-05-28T11:00:00.000Z'),
        description:
            'Практикум по UX: customer journey, прототипы в Figma и разбор кейсов мобильных приложений. Подойдёт дизайнерам и продактам.',
        isPrivate: false,
        creatorEmail: 'user2@example.com',
        tags: ['design', 'ux', 'product'],
        cover: {
            url: 'https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_fill/kitten.jpg',
            cloudinaryPublicId: 'seed/cover-design-workshop',
            originalFileName: 'design-workshop-cover.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 198_000,
        },
        participants: [
            { email: 'user5@example.com', tags: ['design', 'figma'] },
            { email: 'user6@example.com', tags: ['ux', 'research'] },
            { email: 'user9@example.com', tags: ['product', 'analytics'] },
            { email: 'user10@example.com', tags: ['design', 'mobile'] },
            { email: 'user11@example.com', tags: ['ux', 'prototyping'] },
            { email: 'user12@example.com', tags: ['design', 'branding'] },
        ],
        matchRequests: [
            {
                from: 'user10@example.com',
                to: 'user6@example.com',
                status: MatchRequestStatus.PENDING,
            },
            {
                from: 'user9@example.com',
                to: 'user5@example.com',
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2026-05-05T16:00:00.000Z'),
            },
        ],
    },
    {
        slug: 'fnd-dnrf-apr',
        title: 'Закрытый ужин для фаундеров',
        date: new Date('2026-04-15T19:30:00.000Z'),
        description:
            'Приватная встреча основателей стартапов: обмен опытом по fundraising, питч-сессия и знакомства в узком кругу по приглашению.',
        isPrivate: true,
        creatorEmail: 'user1@example.com',
        tags: ['startup', 'founders', 'investors'],
        participants: [
            { email: 'user1@example.com', tags: ['startup', 'b2b'] },
            { email: 'user2@example.com', tags: ['startup', 'saas'] },
            { email: 'user3@example.com', tags: ['founders', 'mentorship'] },
        ],
        matchRequests: [
            {
                from: 'user2@example.com',
                to: 'user3@example.com',
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2026-04-10T11:00:00.000Z'),
            },
        ],
    },
    {
        slug: 'ai-hkth-jul',
        title: 'AI Hackathon Demo Day',
        date: new Date('2026-07-12T15:00:00.000Z'),
        description:
            'Финал хакатона по машинному обучению: демо проектов, оценка жюри и нетворкинг команд. Участники смогут отправлять match-запросы друг другу.',
        isPrivate: false,
        creatorEmail: 'user2@example.com',
        tags: ['ai', 'ml', 'hackathon'],
        participants: [
            { email: 'user1@example.com', tags: ['ai', 'nlp'] },
            { email: 'user4@example.com', tags: ['ml', 'computer-vision'] },
            { email: 'user7@example.com', tags: ['ai', 'llm'] },
            { email: 'user9@example.com', tags: ['ml', 'data-science'] },
            { email: 'user13@example.com', tags: ['ai', 'agents'] },
            { email: 'user15@example.com', tags: ['hackathon', 'team-lead'] },
        ],
        matchRequests: [
            {
                from: 'user7@example.com',
                to: 'user4@example.com',
                status: MatchRequestStatus.PENDING,
            },
            {
                from: 'user13@example.com',
                to: 'user1@example.com',
                status: MatchRequestStatus.ACCEPTED,
                respondedAt: new Date('2026-05-14T10:00:00.000Z'),
            },
        ],
    },
] as const;

const tagIdByName = new Map<string, string>();

async function resolveTagIds(tagNames: readonly string[]) {
    const ids: string[] = [];

    for (const name of tagNames) {
        let tagId = tagIdByName.get(name);
        if (!tagId) {
            const tag = await prisma.tag.create({ data: { name } });
            tagId = tag.id;
            tagIdByName.set(name, tagId);
        }
        ids.push(tagId);
    }

    return ids;
}

const USER_IDS_BY_EMAIL: Record<string, string> = {
    'user5@example.com': SEED_USER_ID.user5,
    'user8@example.com': SEED_USER_ID.user8,
};

async function createUser(
    hashedPassword: string,
    data: {
        id?: string;
        email: string;
        fullName: string;
        contacts: ReadonlyArray<{ type: ContactType; value: string }>;
        avatar?: {
            url: string;
            cloudinaryPublicId: string;
            originalFileName: string;
            mimeType: string;
            sizeBytes: number;
        };
    },
) {
    let avatarImageId: string | undefined;

    if (data.avatar) {
        const image = await prisma.image.create({
            data: {
                url: data.avatar.url,
                cloudinaryPublicId: data.avatar.cloudinaryPublicId,
                originalFileName: data.avatar.originalFileName,
                mimeType: data.avatar.mimeType,
                sizeBytes: data.avatar.sizeBytes,
            },
        });
        avatarImageId = image.id;
    }

    const user = await prisma.user.create({
        data: {
            id: data.id,
            email: data.email,
            hashedPassword,
            fullName: data.fullName,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            avatarImageId,
            contacts: {
                create: data.contacts.map((contact) => ({
                    type: contact.type,
                    value: contact.value,
                })),
            },
        },
    });

    if (data.avatar) {
        await prisma.image.update({
            where: { id: avatarImageId! },
            data: { uploadedById: user.id },
        });
    }

    return user;
}

async function main() {
    await truncateDatabase(prisma);

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    const userIds = new Map<string, string>();

    for (const userSeed of USERS) {
        const user = await createUser(hashedPassword, {
            ...userSeed,
            id: USER_IDS_BY_EMAIL[userSeed.email],
        });
        userIds.set(userSeed.email, user.id);
    }

    for (const eventSeed of EVENTS) {
        const creatorId = userIds.get(eventSeed.creatorEmail);
        if (!creatorId) {
            throw new Error(`Creator not found: ${eventSeed.creatorEmail}`);
        }

        const tagIds = await resolveTagIds(eventSeed.tags);

        let coverImageId: string | undefined;
        const coverSeed = 'cover' in eventSeed ? eventSeed.cover : undefined;
        if (coverSeed) {
            const cover = await prisma.image.create({
                data: {
                    url: coverSeed.url,
                    cloudinaryPublicId: coverSeed.cloudinaryPublicId,
                    originalFileName: coverSeed.originalFileName,
                    mimeType: coverSeed.mimeType,
                    sizeBytes: coverSeed.sizeBytes,
                    uploadedById: creatorId,
                },
            });
            coverImageId = cover.id;
        }

        const event = await prisma.event.create({
            data: {
                slug: eventSeed.slug,
                title: eventSeed.title,
                date: eventSeed.date,
                description: eventSeed.description,
                isPrivate: eventSeed.isPrivate,
                organizerId: creatorId,
                coverImageId,
                tags: { connect: tagIds.map((id) => ({ id })) },
            },
        });

        for (const participant of eventSeed.participants) {
            const userId = userIds.get(participant.email);
            if (!userId) {
                throw new Error(`User not found: ${participant.email}`);
            }

            const participantTagIds = await resolveTagIds(participant.tags);

            await prisma.eventParticipant.create({
                data: {
                    userId,
                    eventId: event.id,
                    tags: { connect: participantTagIds.map((id) => ({ id })) },
                },
            });
        }

        for (const matchSeed of eventSeed.matchRequests) {
            const fromUserId = userIds.get(matchSeed.from);
            const toUserId = userIds.get(matchSeed.to);
            if (!fromUserId || !toUserId) {
                throw new Error(
                    `Match users not found: ${matchSeed.from} -> ${matchSeed.to}`,
                );
            }

            await prisma.matchRequest.create({
                data: {
                    id: 'id' in matchSeed ? matchSeed.id : undefined,
                    eventId: event.id,
                    fromUserId,
                    toUserId,
                    status: matchSeed.status,
                    respondedAt:
                        'respondedAt' in matchSeed
                            ? matchSeed.respondedAt
                            : undefined,
                },
            });
        }
    }

    const tagCount = await prisma.tag.count();
    const imageCount = await prisma.image.count();
    const eventCount = await prisma.event.count();
    const participantCount = await prisma.eventParticipant.count();
    const contactCount = await prisma.userContact.count();
    const matchCount = await prisma.matchRequest.count();

    console.log('Seed completed (database was cleared before seeding)');
    console.log(`Password for all accounts: ${DEFAULT_PASSWORD}`);
    console.log('Accounts: user1@example.com … user18@example.com');
    console.log('');
    console.log('Event creators:');
    console.log('  user1@example.com — bkd-mtup-jun, fnd-dnrf-apr');
    console.log('  user2@example.com — dsn-wksh-may, ai-hkth-jul');
    console.log('');
    console.log('Events (slug):');
    console.log('  bkd-mtup-jun — Backend & DevOps Meetup');
    console.log('  dsn-wksh-may — Product Design Workshop');
    console.log('  fnd-dnrf-apr — Закрытый ужин для фаундеров (private)');
    console.log('  ai-hkth-jul  — AI Hackathon Demo Day');
    console.log('');
    console.log('Counts:', {
        users: userIds.size,
        tags: tagCount,
        images: imageCount,
        events: eventCount,
        participants: participantCount,
        contacts: contactCount,
        matchRequests: matchCount,
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
