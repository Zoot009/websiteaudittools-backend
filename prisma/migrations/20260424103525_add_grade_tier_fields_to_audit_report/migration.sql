-- AlterTable
ALTER TABLE "AuditReport" ADD COLUMN     "accessibilityGrade" TEXT,
ADD COLUMN     "accessibilityTier" TEXT,
ADD COLUMN     "linkGrade" TEXT,
ADD COLUMN     "linkTier" TEXT,
ADD COLUMN     "onPageGrade" TEXT,
ADD COLUMN     "onPageTier" TEXT,
ADD COLUMN     "overallGrade" TEXT,
ADD COLUMN     "overallTier" TEXT,
ADD COLUMN     "performanceGrade" TEXT,
ADD COLUMN     "performanceTier" TEXT,
ADD COLUMN     "securityGrade" TEXT,
ADD COLUMN     "securityTier" TEXT,
ADD COLUMN     "structuredDataGrade" TEXT,
ADD COLUMN     "structuredDataTier" TEXT,
ADD COLUMN     "technicalGrade" TEXT,
ADD COLUMN     "technicalTier" TEXT;

-- AlterTable
ALTER TABLE "CreditAccount" ADD COLUMN     "monthlyQuotaBalance" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UsageReservation" ADD COLUMN     "quotaConsumed" INTEGER NOT NULL DEFAULT 0;
