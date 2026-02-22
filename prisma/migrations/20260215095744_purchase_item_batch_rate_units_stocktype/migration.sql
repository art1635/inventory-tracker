-- DropIndex
DROP INDEX "PurchaseItem_purchaseId_productId_key";

-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN "batchNumber" TEXT;
ALTER TABLE "PurchaseItem" ADD COLUMN "ratePerLitre" REAL;
ALTER TABLE "PurchaseItem" ADD COLUMN "stockType" TEXT;
ALTER TABLE "PurchaseItem" ADD COLUMN "unitsReceived" INTEGER;
