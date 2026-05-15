-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('TELEGRAM', 'EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "user_contacts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_contacts_user_id_idx" ON "user_contacts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_contacts_user_id_type_value_key" ON "user_contacts"("user_id", "type", "value");

-- AddForeignKey
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
