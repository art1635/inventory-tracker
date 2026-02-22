-- DropIndex
DROP INDEX "SaleItem_saleId_productId_key";

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN "batchNumber" TEXT;
ALTER TABLE "SaleItem" ADD COLUMN "stockType" TEXT;
