// Mock database for local development without PostgreSQL
// This allows the app to run without a database connection for testing UI

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

export interface BOMRecord {
  id: string;
  name: string;
  project_in_kw: number;
  wattage_of_panels: number;
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

// In-memory storage
let mockItems: string[] = ['Solar Panels', 'Inverters', 'Batteries', 'Wires', 'Mounting Structure'];
const mockTypes: Record<string, string[]> = {
  'Solar Panels': ['550W Mono', '450W Poly'],
  'Inverters': ['5KW On-Grid', '10KW Hybrid'],
  'Wires': ['AC Wire 4mm²', 'DC Wire 6mm²', 'Earthing Wire 16mm²']
};
let mockSources: string[] = ['Main Warehouse', 'Site Storage', 'Supplier Direct'];
const mockSuppliers: Record<string, string[]> = {
  'Main Warehouse': ['Solar Tech India', 'Green Energy Corp'],
  'Supplier Direct': ['Direct Solar Imports']
};
// Start with empty events - users add their own data
let mockEvents: InventoryEvent[] = [];

export async function initDatabase() {
  console.log('Using mock database - no PostgreSQL connection required for local development');
  return { success: true };
}

export async function seedInitialData() {
  console.log('Mock data already loaded');
  return { success: true };
}

export async function getItems() {
  return [...mockItems];
}

export async function addItem(name: string) {
  if (!mockItems.includes(name)) {
    mockItems.push(name);
    mockItems.sort();
  }
}

export async function removeItem(name: string) {
  mockItems = mockItems.filter(i => i !== name);
  delete mockTypes[name];
}

export async function getTypes() {
  return { ...mockTypes };
}

export async function getTypesForItem(itemName: string) {
  return mockTypes[itemName] || [];
}

export async function addType(itemName: string, typeName: string) {
  if (!mockTypes[itemName]) {
    mockTypes[itemName] = [];
  }
  if (!mockTypes[itemName].includes(typeName)) {
    mockTypes[itemName].push(typeName);
    mockTypes[itemName].sort();
  }
}

export async function removeType(itemName: string, typeName: string) {
  if (mockTypes[itemName]) {
    mockTypes[itemName] = mockTypes[itemName].filter(t => t !== typeName);
  }
}

export async function getSources() {
  return [...mockSources];
}

export async function addSource(name: string) {
  if (!mockSources.includes(name)) {
    mockSources.push(name);
    mockSources.sort();
  }
}

export async function removeSource(name: string) {
  mockSources = mockSources.filter(s => s !== name);
  delete mockSuppliers[name];
}

export async function getSuppliers() {
  return { ...mockSuppliers };
}

export async function getSuppliersForSource(sourceName: string) {
  return mockSuppliers[sourceName] || [];
}

export async function addSupplier(sourceName: string, supplierName: string) {
  if (!mockSuppliers[sourceName]) {
    mockSuppliers[sourceName] = [];
  }
  if (!mockSuppliers[sourceName].includes(supplierName)) {
    mockSuppliers[sourceName].push(supplierName);
    mockSuppliers[sourceName].sort();
  }
}

export async function removeSupplier(supplierName: string) {
  Object.keys(mockSuppliers).forEach(source => {
    mockSuppliers[source] = mockSuppliers[source].filter(s => s !== supplierName);
  });
}

export async function getEvents() {
  return [...mockEvents].sort((a, b) => b.timestamp - a.timestamp);
}

export async function addEvent(event: InventoryEvent) {
  mockEvents.push(event);
}

export async function deleteEvent(id: string) {
  mockEvents = mockEvents.filter(e => e.id !== id);
}

// BOM storage
let mockBOM: BOMRecord[] = [];

export async function getBOMRecords() {
  return [...mockBOM].sort((a, b) => b.created_at - a.created_at);
}

export async function addBOMRecord(bom: BOMRecord) {
  mockBOM.push(bom);
}

export async function deleteBOMRecord(id: string) {
  mockBOM = mockBOM.filter(b => b.id !== id);
}
