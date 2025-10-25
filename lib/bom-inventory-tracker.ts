/**
 * BOM Inventory Tracker
 * Tracks which inventory items are needed for BOMs and identifies missing stock
 */

import { BOMRecord, generateBOMRows } from './bom-calculations';

export interface InventoryItem {
  item: string;
  type: string;
  qty: number;
}

export interface MissingStockItem {
  item: string;
  type: string;
  currentQty: number;
  requiredQty: number;
  shortfall: number;
  requiredBy: string[]; // Customer names
  status: 'missing' | 'insufficient';
}

/**
 * Map BOM row items to inventory items
 * This creates standardized item/type pairs for inventory tracking
 */
function mapBOMRowToInventory(bomRow: any, customerName: string): Array<{item: string, type: string, qty: number, customer: string}> {
  const items: Array<{item: string, type: string, qty: number, customer: string}> = [];
  
  const qty = typeof bomRow.qty === 'string' ? parseFloat(bomRow.qty) : bomRow.qty;
  if (!qty || isNaN(qty) || qty <= 0) return items;
  
  // Map BOM items to inventory categories
  const itemName = bomRow.item.toLowerCase();
  
  if (itemName.includes('solar panel')) {
    items.push({
      item: 'Solar Panels',
      type: bomRow.description || 'Standard Panel',
      qty,
      customer: customerName
    });
  } else if (itemName.includes('inverter')) {
    items.push({
      item: 'Inverters',
      type: bomRow.description || 'Standard Inverter',
      qty,
      customer: customerName
    });
  } else if (itemName.includes('wire') || itemName.includes('cable')) {
    items.push({
      item: 'Wires',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('mcb') || itemName.includes('elcb')) {
    items.push({
      item: 'Protection Devices',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('dcdb') || itemName.includes('acdb')) {
    items.push({
      item: 'Distribution Boxes',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('thimble') || itemName.includes('connector')) {
    items.push({
      item: 'Connectors',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('earthing')) {
    items.push({
      item: 'Earthing Materials',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('upvc') || itemName.includes('pipe') || itemName.includes('tray')) {
    items.push({
      item: 'Piping & Trays',
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  } else {
    // Generic mapping for other items
    items.push({
      item: bomRow.item,
      type: bomRow.description || bomRow.item,
      qty,
      customer: customerName
    });
  }
  
  return items;
}

/**
 * Calculate all required inventory for BOMs
 */
export function calculateRequiredInventory(bomRecords: BOMRecord[]): Map<string, {item: string, type: string, totalQty: number, customers: string[]}> {
  const required = new Map<string, {item: string, type: string, totalQty: number, customers: string[]}>();
  
  bomRecords.forEach(bom => {
    const rows = generateBOMRows(bom);
    
    rows.forEach(row => {
      const inventoryItems = mapBOMRowToInventory(row, bom.name);
      
      inventoryItems.forEach(invItem => {
        const key = `${invItem.item}::${invItem.type}`;
        
        if (required.has(key)) {
          const existing = required.get(key)!;
          existing.totalQty += invItem.qty;
          if (!existing.customers.includes(invItem.customer)) {
            existing.customers.push(invItem.customer);
          }
        } else {
          required.set(key, {
            item: invItem.item,
            type: invItem.type,
            totalQty: invItem.qty,
            customers: [invItem.customer]
          });
        }
      });
    });
  });
  
  return required;
}

/**
 * Find missing or insufficient stock
 */
export function findMissingStock(
  requiredInventory: Map<string, {item: string, type: string, totalQty: number, customers: string[]}>,
  currentInventory: Map<string, number>
): MissingStockItem[] {
  const missing: MissingStockItem[] = [];
  
  requiredInventory.forEach((req, key) => {
    const currentQty = currentInventory.get(key) || 0;
    
    if (currentQty === 0) {
      missing.push({
        item: req.item,
        type: req.type,
        currentQty: 0,
        requiredQty: req.totalQty,
        shortfall: req.totalQty,
        requiredBy: req.customers,
        status: 'missing'
      });
    } else if (currentQty < req.totalQty) {
      missing.push({
        item: req.item,
        type: req.type,
        currentQty,
        requiredQty: req.totalQty,
        shortfall: req.totalQty - currentQty,
        requiredBy: req.customers,
        status: 'insufficient'
      });
    }
  });
  
  return missing.sort((a, b) => {
    // Sort by status (missing first), then by shortfall
    if (a.status !== b.status) {
      return a.status === 'missing' ? -1 : 1;
    }
    return b.shortfall - a.shortfall;
  });
}
