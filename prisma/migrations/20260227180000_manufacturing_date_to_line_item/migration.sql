-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN "manufacturingDate" TIMESTAMP(3);
ALTER TABLE "Purchase" DROP COLUMN IF EXISTS "manufacturingDate";
