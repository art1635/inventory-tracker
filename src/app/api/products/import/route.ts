import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";

// Expected column headers (case-insensitive, any of these map to the field)
const COL_NAME = ["name", "product name", "product"];
const COL_SKU = ["sku", "code"];
const COL_DESC = ["description", "desc"];
const COL_UNIT = ["unit", "units"];
const COL_STOCK = ["stock type", "stocktype", "stock"];
const COL_LITRES = ["litres", "liters", "volume"];
const COL_RATE = ["default rate per litre", "rate per litre", "default rate", "rate/l", "default ₹/l"];
const COL_GST = ["gst", "gst %", "gst%", "gst perc"];

function norm(s: string): string {
  return (s ?? "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function findCol(headers: string[], aliases: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (aliases.some((a) => h === a || h.includes(a))) return i;
  }
  return -1;
}

function num(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded. Use form field 'file' with an Excel file." },
        { status: 400 }
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buf, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) {
      return NextResponse.json(
        { error: "Excel file has no sheets." },
        { status: 400 }
      );
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
      header: 1,
      defval: "",
    }) as unknown[][];
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "Excel must have a header row and at least one data row." },
        { status: 400 }
      );
    }
    const headerRow = rows[0].map((c) => String(c ?? "").trim());
    const nameCol = findCol(headerRow, COL_NAME);
    if (nameCol < 0) {
      return NextResponse.json(
        { error: "A 'Name' (or 'Product name') column is required in the first row." },
        { status: 400 }
      );
    }
    const skuCol = findCol(headerRow, COL_SKU);
    const unitCol = findCol(headerRow, COL_UNIT);
    const stockCol = findCol(headerRow, COL_STOCK);
    const litresCol = findCol(headerRow, COL_LITRES);
    if (skuCol < 0) {
      return NextResponse.json(
        { error: "A 'SKU' column is required in the first row." },
        { status: 400 }
      );
    }
    if (unitCol < 0) {
      return NextResponse.json(
        { error: "A 'Unit' column is required in the first row." },
        { status: 400 }
      );
    }
    if (stockCol < 0) {
      return NextResponse.json(
        { error: "A 'Stock type' column is required in the first row (e.g. Drum or Pail)." },
        { status: 400 }
      );
    }
    if (litresCol < 0) {
      return NextResponse.json(
        { error: "A 'Litres' column is required in the first row." },
        { status: 400 }
      );
    }
    const descCol = findCol(headerRow, COL_DESC);
    const rateCol = findCol(headerRow, COL_RATE);
    const gstCol = findCol(headerRow, COL_GST);

    const created: string[] = [];
    const errors: { row: number; message: string }[] = [];
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      if (!Array.isArray(row)) continue;
      const nameVal = row[nameCol];
      const name = nameVal != null ? String(nameVal).trim() : "";
      if (!name) continue; // skip empty rows
      const sku = row[skuCol] != null ? String(row[skuCol]).trim() : "";
      const unit = row[unitCol] != null ? String(row[unitCol]).trim() : "";
      const stockType = row[stockCol] != null ? String(row[stockCol]).trim() : "";
      const litresVal = num(row[litresCol]);
      if (!sku) {
        errors.push({ row: r + 1, message: `${name}: SKU is required` });
        continue;
      }
      if (!unit) {
        errors.push({ row: r + 1, message: `${name}: Unit is required` });
        continue;
      }
      if (!stockType) {
        errors.push({ row: r + 1, message: `${name}: Stock type is required` });
        continue;
      }
      if (litresVal == null || litresVal < 0) {
        errors.push({ row: r + 1, message: `${name}: Litres is required (0 or more)` });
        continue;
      }
      const description = descCol >= 0 && row[descCol] != null ? String(row[descCol]).trim() || null : null;
      const defaultRatePerLitre = rateCol >= 0 ? num(row[rateCol]) : null;
      const gstPerc = gstCol >= 0 ? num(row[gstCol]) : null;
      try {
        const product = await prisma.product.create({
          data: {
            name,
            sku,
            description,
            unit,
            stockType,
            litres: litresVal,
            defaultRatePerLitre: defaultRatePerLitre != null ? defaultRatePerLitre : null,
            gstPerc: gstPerc != null ? gstPerc : null,
          },
        });
        await prisma.inventory.create({
          data: { productId: product.id, quantity: 0 },
        });
        created.push(product.name);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to create product";
        errors.push({ row: r + 1, message: `${name}: ${msg}` });
      }
    }
    return NextResponse.json({
      created: created.length,
      createdNames: created,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed" },
      { status: 500 }
    );
  }
}
