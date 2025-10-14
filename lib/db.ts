// PostgreSQL database connection and utilities
import { sql } from '@vercel/postgres';
import * as mockDb from './db-mock';

// Check if we should use mock database (evaluated at runtime)
function shouldUseMockDb() {
  return !process.env.POSTGRES_URL;
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

// Initialize database tables
export async function initDatabase() {
  if (shouldUseMockDb()) {
    console.log('⚠️  Using mock database - set POSTGRES_URL in .env.local for real database');
    return mockDb.initDatabase();
  }
  
  try {
    // Create items table
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        name VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create types table (item -> types relationship)
    await sql`
      CREATE TABLE IF NOT EXISTS types (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL,
        type_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_name, type_name)
      );
    `;

    // Create sources table
    await sql`
      CREATE TABLE IF NOT EXISTS sources (
        name VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create suppliers table (source -> suppliers relationship)
    await sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        source_name VARCHAR(255) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_name, supplier_name)
      );
    `;

    // Create events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(255) PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        item VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        qty INTEGER NOT NULL,
        rate DECIMAL(10, 2) NOT NULL,
        source VARCHAR(255) NOT NULL,
        supplier VARCHAR(255) NOT NULL,
        kind VARCHAR(3) NOT NULL CHECK (kind IN ('IN', 'OUT')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_item ON events(item);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_types_item ON types(item_name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_source ON suppliers(source_name);`;

    console.log('Database tables initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Items CRUD
export async function getItems() {
  if (shouldUseMockDb()) return mockDb.getItems();
  const { rows } = await sql`SELECT name FROM items ORDER BY name`;
  return rows.map(row => row.name);
}

export async function addItem(name: string) {
  if (shouldUseMockDb()) return mockDb.addItem(name);
  await sql`INSERT INTO items (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

export async function removeItem(name: string) {
  if (shouldUseMockDb()) return mockDb.removeItem(name);
  await sql`DELETE FROM items WHERE name = ${name}`;
  // Also remove associated types
  await sql`DELETE FROM types WHERE item_name = ${name}`;
}

// Types CRUD
export async function getTypes() {
  if (shouldUseMockDb()) return mockDb.getTypes();
  const { rows } = await sql`
    SELECT item_name, array_agg(type_name ORDER BY type_name) as types
    FROM types
    GROUP BY item_name
  `;
  const result: Record<string, string[]> = {};
  rows.forEach(row => {
    result[row.item_name] = row.types;
  });
  return result;
}

export async function getTypesForItem(itemName: string) {
  if (shouldUseMockDb()) return mockDb.getTypesForItem(itemName);
  const { rows } = await sql`
    SELECT type_name FROM types WHERE item_name = ${itemName} ORDER BY type_name
  `;
  return rows.map(row => row.type_name);
}

export async function addType(itemName: string, typeName: string) {
  if (shouldUseMockDb()) return mockDb.addType(itemName, typeName);
  await sql`
    INSERT INTO types (item_name, type_name) 
    VALUES (${itemName}, ${typeName}) 
    ON CONFLICT (item_name, type_name) DO NOTHING
  `;
}

export async function removeType(itemName: string, typeName: string) {
  if (shouldUseMockDb()) return mockDb.removeType(itemName, typeName);
  await sql`DELETE FROM types WHERE item_name = ${itemName} AND type_name = ${typeName}`;
}

// Sources CRUD
export async function getSources() {
  if (shouldUseMockDb()) return mockDb.getSources();
  const { rows } = await sql`SELECT name FROM sources ORDER BY name`;
  return rows.map(row => row.name);
}

export async function addSource(name: string) {
  if (shouldUseMockDb()) return mockDb.addSource(name);
  await sql`INSERT INTO sources (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

export async function removeSource(name: string) {
  if (shouldUseMockDb()) return mockDb.removeSource(name);
  await sql`DELETE FROM sources WHERE name = ${name}`;
  // Also remove associated suppliers
  await sql`DELETE FROM suppliers WHERE source_name = ${name}`;
}

// Suppliers CRUD
export async function getSuppliers() {
  if (shouldUseMockDb()) return mockDb.getSuppliers();
  const { rows } = await sql`
    SELECT source_name, array_agg(supplier_name ORDER BY supplier_name) as suppliers
    FROM suppliers
    GROUP BY source_name
  `;
  const result: Record<string, string[]> = {};
  rows.forEach(row => {
    result[row.source_name] = row.suppliers;
  });
  return result;
}

export async function getSuppliersForSource(sourceName: string) {
  if (shouldUseMockDb()) return mockDb.getSuppliersForSource(sourceName);
  const { rows } = await sql`
    SELECT supplier_name FROM suppliers WHERE source_name = ${sourceName} ORDER BY supplier_name
  `;
  return rows.map(row => row.supplier_name);
}

export async function addSupplier(sourceName: string, supplierName: string) {
  if (shouldUseMockDb()) return mockDb.addSupplier(sourceName, supplierName);
  await sql`
    INSERT INTO suppliers (source_name, supplier_name) 
    VALUES (${sourceName}, ${supplierName}) 
    ON CONFLICT (source_name, supplier_name) DO NOTHING
  `;
}

export async function removeSupplier(supplierName: string) {
  if (shouldUseMockDb()) return mockDb.removeSupplier(supplierName);
  await sql`DELETE FROM suppliers WHERE supplier_name = ${supplierName}`;
}

// Events CRUD
export async function getEvents() {
  if (shouldUseMockDb()) return mockDb.getEvents();
  const { rows } = await sql`SELECT * FROM events ORDER BY timestamp DESC`;
  return rows as InventoryEvent[];
}

export async function addEvent(event: InventoryEvent) {
  if (shouldUseMockDb()) return mockDb.addEvent(event);
  await sql`
    INSERT INTO events (id, timestamp, item, type, qty, rate, source, supplier, kind)
    VALUES (${event.id}, ${event.timestamp}, ${event.item}, ${event.type}, ${event.qty}, ${event.rate}, ${event.source}, ${event.supplier}, ${event.kind})
  `;
}

export async function deleteEvent(id: string) {
  if (shouldUseMockDb()) return mockDb.deleteEvent(id);
  await sql`DELETE FROM events WHERE id = ${id}`;
}

// Seed initial data
export async function seedInitialData() {
  if (shouldUseMockDb()) {
    return mockDb.seedInitialData();
  }
  
  try {
    // Check if data already exists
    const { rows } = await sql`SELECT COUNT(*) as count FROM items`;
    if (rows[0].count > 0) {
      console.log('Data already exists, skipping seed');
      return;
    }

    // Add sample items
    const sampleItems = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones'];
    for (const item of sampleItems) {
      await addItem(item);
    }

    // Add sample types
    await addType('Laptop', 'Dell');
    await addType('Laptop', 'HP');
    await addType('Mouse', 'Wireless');
    await addType('Mouse', 'Wired');

    // Add sample sources
    const sampleSources = ['Warehouse A', 'Warehouse B', 'Supplier Direct'];
    for (const source of sampleSources) {
      await addSource(source);
    }

    // Add sample suppliers
    await addSupplier('Warehouse A', 'TechCorp');
    await addSupplier('Warehouse A', 'GlobalSupply');
    await addSupplier('Warehouse B', 'LocalVendor');

    // Add sample events
    const sampleEvents: InventoryEvent[] = [
      {
        id: `evt-${Date.now()}-1`,
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
        id: `evt-${Date.now()}-2`,
        timestamp: Date.now() - 43200000,
        item: 'Mouse',
        type: 'Wireless',
        qty: 5,
        rate: 500,
        source: 'Warehouse B',
        supplier: 'LocalVendor',
        kind: 'OUT'
      }
    ];

    for (const event of sampleEvents) {
      await addEvent(event);
    }

    console.log('Sample data seeded successfully');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}
