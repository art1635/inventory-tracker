-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "Supplier" DROP COLUMN IF EXISTS "address";
