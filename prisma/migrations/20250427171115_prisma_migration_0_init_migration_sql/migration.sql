-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "finalPath" TEXT,
    "duration" INTEGER,
    "size" INTEGER,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "trimmedStartTime" INTEGER,
    "trimmedEndTime" INTEGER,
    "subtitles" JSONB,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);
