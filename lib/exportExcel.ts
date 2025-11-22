import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { InventoryEvent } from "@/lib/inventory-store-postgres";

/**
 * Export ALL inventory events into Excel
 */
export async function exportAllEventsToExcel(events: InventoryEvent[]) {
  const rows = events.map((e) => {
    // Handle timestamp - could be milliseconds or seconds
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    
    return {
      Item: e.item,
      Type: e.type,
      Quantity: e.qty,
      Source: e.source,
      Invoice: e.supplier,
      Rate: e.rate,
      Date: isValidDate ? date.toLocaleString() : "Invalid Date",
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

  const rows: { Item: string; Type: string; "Current Stock": number }[] = [];

  Object.entries(stockMap).forEach(([item, types]) => {
    Object.entries(types).forEach(([type, qty]) => {
      if (qty > 0) { // Only show items with positive stock
        rows.push({ 
          Item: item, 
          Type: type, 
          "Current Stock": qty 
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

/**
 * Export Stock IN events only
 */
export async function exportStockInToExcel(events: InventoryEvent[]) {
  const inEvents = events.filter(e => e.kind === "IN");

  const rows = inEvents.map((e) => {
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    
    return {
      Item: e.item,
      Type: e.type,
      Quantity: e.qty,
      Source: e.source,
      Invoice: e.supplier,
      Rate: e.rate,
      Date: isValidDate ? date.toLocaleString() : "Invalid Date",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock IN");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "stock_in.xlsx");
}

/**
 * Export Stock OUT events only
 */
export async function exportStockOutToExcel(events: InventoryEvent[]) {
  const outEvents = events.filter(e => e.kind === "OUT");

  const rows = outEvents.map((e) => {
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    
    return {
      Item: e.item,
      Type: e.type,
      Quantity: e.qty,
      Source: e.source,
      Invoice: e.supplier,
      Rate: e.rate,
      Date: isValidDate ? date.toLocaleString() : "Invalid Date",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock OUT");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), "stock_out.xlsx");
}

/**
 * Export events within a date range
 */
export async function exportByDateRange(events: InventoryEvent[], startDate: Date, endDate: Date) {
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  
  const filteredEvents = events.filter(e => {
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    return timestamp >= startTime && timestamp <= endTime;
  });

  const rows = filteredEvents.map((e) => {
    const timestamp = e.timestamp > 10000000000 ? e.timestamp : e.timestamp * 1000;
    const date = new Date(timestamp);
    const isValidDate = !isNaN(date.getTime());
    
    return {
      Item: e.item,
      Type: e.type,
      Quantity: e.qty,
      Source: e.source,
      Invoice: e.supplier,
      Rate: e.rate,
      Date: isValidDate ? date.toLocaleString() : "Invalid Date",
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Filtered Events");

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const fileName = `events_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.xlsx`;
  saveAs(new Blob([wbout], { type: "application/octet-stream" }), fileName);
}
