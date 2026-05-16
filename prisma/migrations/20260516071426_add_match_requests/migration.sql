-- CreateEnum
CREATE TYPE "MatchRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "match_requests" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "status" "MatchRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),

    CONSTRAINT "match_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_requests_event_id_to_user_id_status_idx" ON "match_requests"("event_id", "to_user_id", "status");

-- CreateIndex
CREATE INDEX "match_requests_event_id_from_user_id_status_idx" ON "match_requests"("event_id", "from_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_requests_event_id_from_user_id_to_user_id_key" ON "match_requests"("event_id", "from_user_id", "to_user_id");

-- AddForeignKey
ALTER TABLE "match_requests" ADD CONSTRAINT "match_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_requests" ADD CONSTRAINT "match_requests_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_requests" ADD CONSTRAINT "match_requests_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
