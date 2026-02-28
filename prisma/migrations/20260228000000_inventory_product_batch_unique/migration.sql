-- AlterTable: Inventory unique by (productId, batchNumber)
-- Step 1: Add batchNumber with default for existing rows (one row per product → batch '').
ALTER TABLE "Inventory" ADD COLUMN "batchNumber" TEXT NOT NULL DEFAULT '';

-- Step 2: Drop the old unique constraint on productId.
DROP INDEX IF EXISTS "Inventory_productId_key";

-- Step 3: Create unique constraint on (productId, batchNumber).
CREATE UNIQUE INDEX "Inventory_productId_batchNumber_key" ON "Inventory"("productId", "batchNumber");
