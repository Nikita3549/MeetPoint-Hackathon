-- DropIndex
DROP INDEX IF EXISTS "users_role_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "UserRole";
