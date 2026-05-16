/*
  Warnings:

  - A unique constraint covering the columns `[cover_image_id]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[avatar_image_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "cover_image_id" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_image_id" TEXT;

-- CreateTable
CREATE TABLE "images" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloudinary_public_id" TEXT NOT NULL,
    "original_file_name" TEXT,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "uploaded_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "images_cloudinary_public_id_key" ON "images"("cloudinary_public_id");

-- CreateIndex
CREATE INDEX "images_uploaded_by_id_idx" ON "images"("uploaded_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_cover_image_id_key" ON "events"("cover_image_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_avatar_image_id_key" ON "users"("avatar_image_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_cover_image_id_fkey" FOREIGN KEY ("cover_image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_image_id_fkey" FOREIGN KEY ("avatar_image_id") REFERENCES "images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
