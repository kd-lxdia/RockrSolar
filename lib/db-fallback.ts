// Simple in-memory fallback for local development when database is unreachable
// This is NOT a full mock - just enough to let the app run locally

export interface BOMRecord {
  id: string;
  name: string;
  project_in_kw: number;
  wattage_of_panels: number;
  panel_name?: string;
  table_option: string;
  phase: "SINGLE" | "TRIPLE";
  ac_wire: string;
  dc_wire: string;
  la_wire: string;
  earthing_wire: string;
  no_of_legs: number;
  front_leg: string;
  back_leg: string;
  roof_design: string;
  created_at: number;
}

export interface InventoryEvent {
  id: string;
  timestamp: number;
  item: string;
  type: string;
  qty: number;
  rate: number;
  source: string;
  supplier: string;
  kind: "IN" | "OUT";
}

// In-memory storage
let items: string[] = [];
let itemHSNCodes: Record<string, string> = {};
let types: Record<string, string[]> = {};
let sources: string[] = [];
let suppliers: Record<string, string[]> = {};
let events: InventoryEvent[] = [];
let boms: BOMRecord[] = [];

export const fallbackDb = {
  // Items
  async getItems() {
    return [...items];
  },
  async addItem(name: string) {
    if (!items.includes(name)) {
      items.push(name);
      items.sort();
    }
  },
  async removeItem(name: string) {
    items = items.filter(i => i !== name);
    delete types[name];
    delete itemHSNCodes[name];
  },

  // HSN Codes
  async getItemHSNCodes() {
    return Object.entries(itemHSNCodes).map(([name, hsn_code]) => ({ name, hsn_code }));
  },
  async getItemHSNCode(itemName: string) {
    return itemHSNCodes[itemName] || null;
  },
  async setItemHSNCode(itemName: string, hsnCode: string) {
    if (hsnCode && hsnCode.trim()) {
      itemHSNCodes[itemName] = hsnCode.trim();
    } else {
      delete itemHSNCodes[itemName];
    }
  },

  // Types
  async getTypes() {
    return { ...types };
  },
  async getTypesForItem(itemName: string) {
    return types[itemName] || [];
  },
  async addType(itemName: string, typeName: string) {
    if (!types[itemName]) types[itemName] = [];
    if (!types[itemName].includes(typeName)) {
      types[itemName].push(typeName);
      types[itemName].sort();
    }
  },
  async removeType(itemName: string, typeName: string) {
    if (types[itemName]) {
      types[itemName] = types[itemName].filter(t => t !== typeName);
    }
  },

  // Sources
  async getSources() {
    return [...sources];
  },
  async addSource(name: string) {
    if (!sources.includes(name)) {
      sources.push(name);
      sources.sort();
    }
  },
  async removeSource(name: string) {
    sources = sources.filter(s => s !== name);
    delete suppliers[name];
  },

  // Suppliers
  async getSuppliers() {
    return { ...suppliers };
  },
  async getSuppliersForSource(sourceName: string) {
    return suppliers[sourceName] || [];
  },
  async addSupplier(sourceName: string, supplierName: string) {
    if (!suppliers[sourceName]) suppliers[sourceName] = [];
    if (!suppliers[sourceName].includes(supplierName)) {
      suppliers[sourceName].push(supplierName);
      suppliers[sourceName].sort();
    }
  },
  async removeSupplier(supplierName: string) {
    Object.keys(suppliers).forEach(source => {
      suppliers[source] = suppliers[source].filter(s => s !== supplierName);
    });
  },

  // Events
  async getEvents() {
    return [...events].sort((a, b) => b.timestamp - a.timestamp);
  },
  async addEvent(event: InventoryEvent) {
    events.push(event);
  },
  async deleteEvent(id: string) {
    events = events.filter(e => e.id !== id);
  },

  // BOMs
  async getBOMRecords() {
    console.log('📋 Fallback: getBOMRecords called, returning', boms.length, 'BOMs');
    return [...boms].sort((a, b) => b.created_at - a.created_at);
  },
  async addBOMRecord(bom: BOMRecord) {
    console.log('📋 Fallback: Adding BOM:', bom.id, bom.name);
    boms.push(bom);
    console.log('📋 Fallback: Total BOMs now:', boms.length);
  },
  async deleteBOMRecord(id: string) {
    console.log('📋 Fallback: Deleting BOM:', id);
    boms = boms.filter(b => b.id !== id);
  },
  async updateBOMRecord(id: string, updatedBOM: BOMRecord) {
    console.log('📋 Fallback: Updating BOM:', id);
    const index = boms.findIndex(b => b.id === id);
    if (index !== -1) {
      boms[index] = updatedBOM;
      console.log('📋 Fallback: BOM updated successfully');
    } else {
      console.log('📋 Fallback: BOM not found for update');
    }
  },

  // Initialize with some starter data
  async init() {
    if (items.length === 0) {
      items = ['Solar Panel', 'Inverter', 'DCDB', 'ACDB', 'MCB', 'ELCB', 'AC wire', 'Dc wire Tin copper', 'Earthing Wire', 'LA', 'Earthing Rod/Plate', 'Mc4 Connector', 'Cable Tie UV', 'Structure Nut Bolt'];
      types = {
        'Solar Panel': ['550W Mono', '450W Poly', '600W Bifacial'],
        'Inverter': ['5KW On-Grid', '10KW Hybrid', '15KW Three-Phase'],
        'AC wire': ['4mm² Copper', '6mm² Copper'],
        'Dc wire Tin copper': ['4mm² Tinned', '6mm² Tinned'],
        'Earthing Wire': ['6mm² Green', '16mm² Green']
      };
      sources = ['Main Warehouse', 'Site Storage', 'Supplier Direct'];
      suppliers = {
        'Main Warehouse': ['Solar Tech India', 'Green Energy Corp'],
        'Supplier Direct': ['Direct Solar Imports']
      };
    }
  }
};
