/**
 * BOM Inventory Tracker
 * Tracks which inventory items are needed for BOMs and identifies missing stock
 */

import { BOMRecord, generateBOMRows } from './bom-calculations';

export interface InventoryItem {
  item: string;
  type: string;
  brand?: string; // Brand/make, defaults to 'standard'
  qty: number;
}

export interface MissingStockItem {
  item: string;
  type: string;
  brand: string; // Brand/make, defaults to 'standard'
  currentQty: number;
  requiredQty: number;
  shortfall: number;
  requiredBy: string[]; // Customer names
  status: 'missing' | 'insufficient';
}

/**
 * Map BOM row items to inventory items
 * This creates standardized item/type/brand tuples for inventory tracking
 */
function mapBOMRowToInventory(bomRow: Record<string, unknown> & { item: string; qty: string | number; description?: string; make?: string }, customerName: string): Array<{item: string, type: string, brand: string, qty: number, customer: string}> {
  const items: Array<{item: string, type: string, brand: string, qty: number, customer: string}> = [];
  
  const qty = typeof bomRow.qty === 'string' ? parseFloat(bomRow.qty) : bomRow.qty;
  if (!qty || isNaN(qty) || qty <= 0) return items;
  
  // Get brand from make field, default to 'standard'
  const brand = (bomRow.make as string || '').trim() || 'standard';
  
  // Map BOM items to inventory categories (use exact item names from BOM)
  const itemName = bomRow.item.toLowerCase();
  
  if (itemName.includes('solar panel')) {
    items.push({
      item: 'Solar Panel',
      type: bomRow.description || 'Standard Panel',
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('inverter')) {
    items.push({
      item: 'Inverter',
      type: bomRow.description || 'Standard Inverter',
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('ac wire')) {
    items.push({
      item: 'AC wire',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('dc wire') || itemName.includes('dc wire tin')) {
    items.push({
      item: 'Dc wire Tin copper',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('earthing wire')) {
    items.push({
      item: 'Earthing Wire',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('mcb') && !itemName.includes('acdb')) {
    items.push({
      item: 'MCB',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('elcb')) {
    items.push({
      item: 'ELCB',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('dcdb')) {
    items.push({
      item: 'DCDB',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('acdb')) {
    items.push({
      item: 'ACDB',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('mc4 connector')) {
    items.push({
      item: 'Mc4 Connector',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('cable tie')) {
    items.push({
      item: 'Cable Tie UV',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('earthing') && (itemName.includes('rod') || itemName.includes('plate'))) {
    items.push({
      item: 'Earthing Rod/Plate',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName.includes('structure nut bolt')) {
    items.push({
      item: 'Structure Nut Bolt',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else if (itemName === 'la' || itemName.includes('la ')) {
    items.push({
      item: 'LA',
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  } else {
    // Generic mapping for other items
    items.push({
      item: bomRow.item,
      type: bomRow.description || bomRow.item,
      brand,
      qty,
      customer: customerName
    });
  }
  
  return items;
}

/**
 * Calculate all required inventory for BOMs
 */
export async function calculateRequiredInventory(bomRecords: BOMRecord[]): Promise<Map<string, {item: string, type: string, brand: string, totalQty: number, customers: string[]}>> {
  const required = new Map<string, {item: string, type: string, brand: string, totalQty: number, customers: string[]}>();
  
  for (const bom of bomRecords) {
    let inventoryItems: Array<{item: string, type: string, brand: string, qty: number, customer: string}> = [];
    
    // First try to load edited items for ANY BOM (not just Custom)
    let editedItems = null;
    
    console.log('📦 Loading BOM items for:', bom.id, bom.name, 'Type:', bom.table_option);
    
    // Try localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`bom-${bom.id}`);
      if (stored) {
        try {
          editedItems = JSON.parse(stored);
          console.log('✅ Loaded edited items from localStorage:', editedItems.length, 'items');
        } catch (e) {
          console.error('Failed to parse edited items:', e);
        }
      }
    }
    
    // Fallback to API if no localStorage data
    if (!editedItems) {
      try {
        const response = await fetch(`/api/bom/edits?bomId=${bom.id}`);
        const data = await response.json();
        if (data.success && data.data) {
          editedItems = data.data;
          console.log('✅ Loaded edited items from API:', editedItems.length, 'items');
        }
      } catch (e) {
        console.error('Failed to fetch edited items:', e);
      }
    }
    
    // Use edited items if available
    if (editedItems && editedItems.length > 0) {
      inventoryItems = editedItems
        .map((item: Record<string, unknown>) => ({
          item: (item.item as string) || "",
          type: (item.description as string) || (item.type as string) || "",
          brand: ((item.make as string) || "").trim() || 'standard',
          qty: parseFloat(String(item.qty || "0")) || 0,
          customer: bom.name,
        }))
        .filter((item: { item: string; type: string; brand: string; qty: number; customer: string }) => item.type && item.qty > 0);
      
      console.log('✅ Using edited items for BOM:', bom.name, 'Items:', inventoryItems.length);
    } else if (bom.table_option === "Custom") {
      // Custom BOM with no items loaded
      console.warn('⚠️ Custom BOM has no items:', bom.id, bom.name);
    } else {
      // For Standard BOMs without edits, use calculated rows
      const rows = generateBOMRows(bom);
      
      rows.forEach(row => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = mapBOMRowToInventory(row as any, bom.name);
        inventoryItems.push(...items);
      });
      
      console.log('✅ Using generated items for BOM:', bom.name, 'Items:', inventoryItems.length);
    }
    
    // Add to required inventory map - use item::type::brand as key
    inventoryItems.forEach(invItem => {
      const key = `${invItem.item}::${invItem.type}::${invItem.brand}`;
      
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
          brand: invItem.brand,
          totalQty: invItem.qty,
          customers: [invItem.customer]
        });
      }
    });
  }
  
  return required;
}

/**
 * Find missing or insufficient stock
 */
export function findMissingStock(
  requiredInventory: Map<string, {item: string, type: string, brand: string, totalQty: number, customers: string[]}>,
  currentInventory: Map<string, number>
): MissingStockItem[] {
  const missing: MissingStockItem[] = [];
  
  requiredInventory.forEach((req, key) => {
    const currentQty = currentInventory.get(key) || 0;
    
    if (currentQty === 0) {
      missing.push({
        item: req.item,
        type: req.type,
        brand: req.brand,
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
        brand: req.brand,
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
