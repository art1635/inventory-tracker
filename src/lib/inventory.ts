import type { PrismaClient } from "@prisma/client";

type PrismaTx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Find inventory row by productId and batchNumber using trimmed comparison.
 * Avoids duplicate rows when DB has leading/trailing spaces in batchNumber.
 */
export async function findInventoryByProductAndBatch(
  client: PrismaTx,
  productId: string,
  batchNumber: string
): Promise<{ id: string; productId: string; batchNumber: string; quantity: number; litres: number } | null> {
  const trimmed = (batchNumber ?? "").trim();
  const rows = await client.inventory.findMany({
    where: { productId },
    select: { id: true, productId: true, batchNumber: true, quantity: true, litres: true },
  });
  const match = rows.find((r) => (r.batchNumber ?? "").trim() === trimmed) ?? null;
  return match;
}
