import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isEmail } from 'class-validator';

type UserUpdatableFieldKey = 'fullName' | 'email';

type UserUpdatableFieldConfig = {
    parse: (value: unknown) => Prisma.UserUpdateInput[UserUpdatableFieldKey];
};

/**
 * Registry of user fields that PUT /users/me may update.
 * To support a new field (e.g. age), add it here and to the Prisma schema.
 */
export const USER_UPDATABLE_FIELDS: Record<
    UserUpdatableFieldKey,
    UserUpdatableFieldConfig
> = {
    fullName: {
        parse: (value) => {
            if (typeof value !== 'string') {
                throw new BadRequestException('fullName must be a string');
            }

            const trimmed = value.trim();

            if (trimmed.length === 0) {
                throw new BadRequestException('fullName must not be empty');
            }

            return trimmed;
        },
    },
    email: {
        parse: (value) => {
            if (typeof value !== 'string') {
                throw new BadRequestException('email must be a string');
            }

            const trimmed = value.trim();

            if (!isEmail(trimmed)) {
                throw new BadRequestException(
                    'email must be a valid email address',
                );
            }

            return trimmed;
        },
    },
};

export function buildUserUpdateData(
    body: Record<string, unknown>,
): Prisma.UserUpdateInput {
    const data: Prisma.UserUpdateInput = {};

    for (const key of Object.keys(
        USER_UPDATABLE_FIELDS,
    ) as UserUpdatableFieldKey[]) {
        if (!(key in body)) {
            continue;
        }

        const value = body[key];

        if (value === undefined) {
            continue;
        }

        data[key] = USER_UPDATABLE_FIELDS[key].parse(value);
    }

    return data;
}
