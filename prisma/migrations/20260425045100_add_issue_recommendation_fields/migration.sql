-- AlterTable
ALTER TABLE "SeoIssue" ADD COLUMN     "data" JSONB,
ADD COLUMN     "how" TEXT,
ADD COLUMN     "moreInfoUrl" TEXT,
ADD COLUMN     "platformGuides" JSONB,
ADD COLUMN     "recommendation" TEXT,
ADD COLUMN     "timeEstimate" TEXT,
ADD COLUMN     "what" TEXT,
ADD COLUMN     "why" TEXT;
