import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { InventoryEvent } from "@/lib/inventory-store-postgres";

/**
 * Export ALL inventory events into Excel
 */
export async function exportAllEventsToExcel(events: InventoryEvent[]) {
  // Fetch all HSN mappings via API (client-side)
  const response = await fetch('/api/hsn');
  const hsnData = await response.json();
  const hsnMappings: Array<{item_name: string, type_name: string, hsn_code: string}> = hsnData.success ? hsnData.data : [];
  
  console.log('📊 Excel Export - HSN Mappings fetched:', hsnMappings.length, 'entries');
  console.log('📊 HSN Mappings:', hsnMappings);
  
  const hsnMap = new Map<string, string>();
  hsnMappings.forEach((m) => {
    hsnMap.set(`${m.item_name}::${m.type_name}`, m.hsn_code || '');
  });

  const rows = events.map((e) => {
    const hsnKey = `${e.item}::${e.type}`;
    const hsnCode = hsnMap.get(hsnKey) || "";
    console.log(`📊 Event: ${e.item}::${e.type} -> HSN: ${hsnCode || '(empty)'}`);
    
    // Handle timestamp - could be milliseconds or seconds
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    
    return {
      ID: e.id,
      Item: e.item,
      Type: e.type,
      "HSN Code": hsnCode,
      Quantity: e.qty,
      Kind: e.kind,
      Source: e.source,
      Invoice: e.supplier,
      Rate: e.rate,
      Date: isValidDate ? date.toLocaleDateString() : "Invalid Date",
      Time: isValidDate ? date.toLocaleTimeString() : "Invalid Time",
    };
  });

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

  // Fetch all HSN mappings via API (client-side)
  const response = await fetch('/api/hsn');
  const hsnData = await response.json();
  const hsnMappings: Array<{item_name: string, type_name: string, hsn_code: string}> = hsnData.success ? hsnData.data : [];
  
  console.log('📊 Current Stock Export - HSN Mappings fetched:', hsnMappings.length, 'entries');
  console.log('📊 HSN Mappings:', hsnMappings);
  
  const hsnMap = new Map<string, string>();
  hsnMappings.forEach((m) => {
    hsnMap.set(`${m.item_name}::${m.type_name}`, m.hsn_code || '');
  });

  const rows: { Item: string; Type: string; "HSN Code": string; Quantity: number }[] = [];

  Object.entries(stockMap).forEach(([item, types]) => {
    Object.entries(types).forEach(([type, qty]) => {
      if (qty > 0) { // Only show items with positive stock
        const hsnKey = `${item}::${type}`;
        const hsnCode = hsnMap.get(hsnKey) || "";
        console.log(`📊 Stock: ${item}::${type} (qty: ${qty}) -> HSN: ${hsnCode || '(empty)'}`);
        
        rows.push({ 
          Item: item, 
          Type: type, 
          "HSN Code": hsnCode,
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
