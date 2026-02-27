-- AlterTable
ALTER TABLE "Customer" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "address";
