-- CreateEnum
CREATE TYPE "DownloadFormat" AS ENUM ('lrc', 'srt');

-- CreateEnum
CREATE TYPE "DownloadSource" AS ENUM ('sync', 'editor', 'upload');

-- CreateTable
CREATE TABLE "Download" (
    "id" SERIAL NOT NULL,
    "format" "DownloadFormat" NOT NULL,
    "source" "DownloadSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Download_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Count" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "value" INTEGER NOT NULL DEFAULT 165,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Count_pkey" PRIMARY KEY ("id")
);

-- The one row of the count, at the schema's starting value.
INSERT INTO "Count" ("id", "updatedAt") VALUES (1, CURRENT_TIMESTAMP);
