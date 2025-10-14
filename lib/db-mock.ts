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

// In-memory storage
let mockItems: string[] = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones'];
let mockTypes: Record<string, string[]> = {
  'Laptop': ['Dell', 'HP', 'Lenovo'],
  'Mouse': ['Wireless', 'Wired'],
  'Keyboard': ['Mechanical', 'Membrane']
};
let mockSources: string[] = ['Warehouse A', 'Warehouse B', 'Supplier Direct'];
let mockSuppliers: Record<string, string[]> = {
  'Warehouse A': ['TechCorp', 'GlobalSupply'],
  'Warehouse B': ['LocalVendor'],
  'Supplier Direct': ['DirectImport']
};
let mockEvents: InventoryEvent[] = [
  {
    id: 'evt-1',
    timestamp: Date.now() - 86400000,
    item: 'Laptop',
    type: 'Dell',
    qty: 10,
    rate: 50000,
    source: 'Warehouse A',
    supplier: 'TechCorp',
    kind: 'IN'
  },
  {
    id: 'evt-2',
    timestamp: Date.now() - 43200000,
    item: 'Mouse',
    type: 'Wireless',
    qty: 5,
    rate: 500,
    source: 'Warehouse B',
    supplier: 'LocalVendor',
    kind: 'OUT'
  },
  {
    id: 'evt-3',
    timestamp: Date.now() - 21600000,
    item: 'Keyboard',
    type: 'Mechanical',
    qty: 15,
    rate: 2000,
    source: 'Warehouse A',
    supplier: 'TechCorp',
    kind: 'IN'
  }
];

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
