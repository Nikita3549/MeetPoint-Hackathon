/*
  Warnings:

  - You are about to drop the `_TagToUser` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PARTICIPANT';

-- DropForeignKey
ALTER TABLE "_TagToUser" DROP CONSTRAINT "_TagToUser_A_fkey";

-- DropForeignKey
ALTER TABLE "_TagToUser" DROP CONSTRAINT "_TagToUser_B_fkey";

-- DropTable
DROP TABLE "_TagToUser";

-- CreateTable
CREATE TABLE "_EventParticipantToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EventParticipantToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_EventParticipantToTag_B_index" ON "_EventParticipantToTag"("B");

-- AddForeignKey
ALTER TABLE "_EventParticipantToTag" ADD CONSTRAINT "_EventParticipantToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "event_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EventParticipantToTag" ADD CONSTRAINT "_EventParticipantToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
