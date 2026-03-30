-- AlterTable
ALTER TABLE "SeoPage" ADD COLUMN     "canonical" TEXT,
ADD COLUMN     "crawledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hasSchemaOrg" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "headingsData" JSONB,
ADD COLUMN     "imagesData" JSONB,
ADD COLUMN     "linksData" JSONB,
ADD COLUMN     "localSeoData" JSONB,
ADD COLUMN     "ogImage" TEXT,
ADD COLUMN     "robots" TEXT;

-- CreateIndex
CREATE INDEX "SeoPage_crawledAt_idx" ON "SeoPage"("crawledAt");
