import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { InventoryEvent } from "@/lib/inventory-store-postgres";
import { getAllTypeHSNMappings } from "@/lib/db";

/**
 * Export ALL inventory events into Excel
 */
export async function exportAllEventsToExcel(events: InventoryEvent[]) {
  // Fetch all HSN mappings
  const hsnMappings = await getAllTypeHSNMappings();
  const hsnMap = new Map(
    hsnMappings.map((m: any) => [`${m.item_name}::${m.type_name}`, m.hsn_code])
  );

  const rows = events.map((e) => ({
    ID: e.id,
    Item: e.item,
    Type: e.type,
    "HSN Code": hsnMap.get(`${e.item}::${e.type}`) || "",
    Quantity: e.qty,
    Kind: e.kind,
    Source: e.source,
    Invoice: e.supplier,
    Rate: e.rate,
    Date: new Date(e.timestamp).toLocaleDateString(),
    Time: new Date(e.timestamp).toLocaleTimeString(),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory Events");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "inventory_events.xlsx");
}

/**
 * Export CURRENT STOCK snapshot (per item/type) calculated from events
 */
export async function exportCurrentStockToExcel(events: InventoryEvent[]) {
  const stockMap: Record<string, Record<string, number>> = {};

  // Calculate current stock from events
  events.forEach((e) => {
    if (!stockMap[e.item]) {
      stockMap[e.item] = {};
    }
    if (!stockMap[e.item][e.type]) {
      stockMap[e.item][e.type] = 0;
    }
    
    // Add for IN, subtract for OUT
    stockMap[e.item][e.type] += e.kind === "IN" ? e.qty : -e.qty;
  });

  // Fetch all HSN mappings
  const hsnMappings = await getAllTypeHSNMappings();
  const hsnMap = new Map(
    hsnMappings.map((m: any) => [`${m.item_name}::${m.type_name}`, m.hsn_code])
  );

  const rows: { Item: string; Type: string; "HSN Code": string; Quantity: number }[] = [];

  Object.entries(stockMap).forEach(([item, types]) => {
    Object.entries(types).forEach(([type, qty]) => {
      if (qty > 0) { // Only show items with positive stock
        rows.push({ 
          Item: item, 
          Type: type, 
          "HSN Code": hsnMap.get(`${item}::${type}`) || "",
          Quantity: qty 
        });
      }
    });
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Current Stock");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "current_stock.xlsx");
}
