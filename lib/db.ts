// PostgreSQL database connection and utilities
import { sql } from './db-client';
import { fallbackDb } from './db-fallback';

// Track if database is available - check only once on first call
let dbAvailable: boolean | null = null;
let dbCheckInProgress = false;

async function isDbAvailable(): Promise<boolean> {
  // Return cached result if already checked
  if (dbAvailable !== null) return dbAvailable;
  
  // Prevent multiple simultaneous checks
  if (dbCheckInProgress) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return isDbAvailable();
  }
  
  dbCheckInProgress = true;
  
  try {
    await Promise.race([
      sql`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
    ]);
    dbAvailable = true;
    console.log('✅ Connected to PostgreSQL database');
  } catch {
    dbAvailable = false;
    console.warn('⚠️  Database unavailable - using local fallback storage');
    console.warn('💡 To use real database: ensure network access to AWS RDS or deploy to production');
    await fallbackDb.init();
  } finally {
    dbCheckInProgress = false;
  }
  
  return dbAvailable;
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
  brand?: string; // Optional brand/make field, defaults to "standard" if empty
}

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

// Initialize database tables
export async function initDatabase() {
  if (!(await isDbAvailable())) {
    console.log('⚠️  Using fallback storage - database unavailable');
    return { success: true };
  }
  
  try {
    // Create items table with HSN code
    await sql`
      CREATE TABLE IF NOT EXISTS items (
        name VARCHAR(255) PRIMARY KEY,
        hsn_code VARCHAR(50),
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

    // Create brands table
    await sql`
      CREATE TABLE IF NOT EXISTS brands (
        name VARCHAR(255) PRIMARY KEY,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        brand VARCHAR(255) DEFAULT 'standard',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for better query performance
    await sql`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_item ON events(item);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_events_kind ON events(kind);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_types_item ON types(item_name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_suppliers_source ON suppliers(source_name);`;

    // Create BOM table
    await sql`
      CREATE TABLE IF NOT EXISTS bom (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        project_in_kw DECIMAL(10, 2) NOT NULL,
        wattage_of_panels DECIMAL(10, 2) NOT NULL,
        table_option VARCHAR(255) NOT NULL,
        phase VARCHAR(10) NOT NULL CHECK (phase IN ('SINGLE', 'TRIPLE')),
        ac_wire VARCHAR(255) NOT NULL,
        dc_wire VARCHAR(255) NOT NULL,
        la_wire VARCHAR(255) NOT NULL,
        earthing_wire VARCHAR(255) NOT NULL,
        no_of_legs INTEGER NOT NULL,
        front_leg VARCHAR(255) NOT NULL,
        back_leg VARCHAR(255) NOT NULL,
        roof_design VARCHAR(255) NOT NULL,
        created_at BIGINT NOT NULL
      );
    `;
    
    await sql`CREATE INDEX IF NOT EXISTS idx_bom_name ON bom(name);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_bom_created_at ON bom(created_at);`;

    // Create BOM edits table for storing user modifications
    await sql`
      CREATE TABLE IF NOT EXISTS bom_edits (
        id SERIAL PRIMARY KEY,
        bom_id VARCHAR(255) NOT NULL,
        edited_data TEXT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_bom_edits_bom_id ON bom_edits(bom_id);`;

    // Add panel_name column if it doesn't exist (migration)
    try {
      await sql`ALTER TABLE bom ADD COLUMN IF NOT EXISTS panel_name VARCHAR(255);`;
    } catch (e) {
      // Column might already exist, ignore error
      console.log('panel_name column already exists or error:', e);
    }

    // Add brand column to events table if it doesn't exist (migration)
    try {
      await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS brand VARCHAR(255) DEFAULT 'standard';`;
    } catch (e) {
      // Column might already exist, ignore error
      console.log('brand column already exists or error:', e);
    }

    console.log('Database tables initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Items CRUD
export async function getItems() {
  if (!(await isDbAvailable())) return fallbackDb.getItems();
  const { rows } = await sql`SELECT name FROM items ORDER BY name`;
  return rows.map(row => row.name);
}

export async function addItem(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.addItem(name);
  await sql`INSERT INTO items (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

export async function removeItem(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.removeItem(name);
  await sql`DELETE FROM items WHERE name = ${name}`;
  // Also remove associated types
  await sql`DELETE FROM types WHERE item_name = ${name}`;
}

// Types CRUD
export async function getTypes() {
  if (!(await isDbAvailable())) return fallbackDb.getTypes();
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
  if (!(await isDbAvailable())) return fallbackDb.getTypesForItem(itemName);
  const { rows } = await sql`
    SELECT type_name FROM types WHERE item_name = ${itemName} ORDER BY type_name
  `;
  return rows.map(row => row.type_name);
}

export async function addType(itemName: string, typeName: string, hsnCode?: string) {
  if (!(await isDbAvailable())) return fallbackDb.addType(itemName, typeName);
  await sql`
    INSERT INTO types (item_name, type_name, hsn_code) 
    VALUES (${itemName}, ${typeName}, ${hsnCode || null}) 
    ON CONFLICT (item_name, type_name) DO UPDATE SET hsn_code = ${hsnCode || null}
  `;
}

export async function removeType(itemName: string, typeName: string) {
  if (!(await isDbAvailable())) return fallbackDb.removeType(itemName, typeName);
  await sql`DELETE FROM types WHERE item_name = ${itemName} AND type_name = ${typeName}`;
}

// HSN Code functions
export async function getHSNForType(itemName: string, typeName: string): Promise<string | null> {
  if (!(await isDbAvailable())) return null;
  try {
    const { rows } = await sql`
      SELECT hsn_code FROM types 
      WHERE item_name = ${itemName} AND type_name = ${typeName}
    `;
    return rows[0]?.hsn_code || null;
  } catch (error) {
    console.error('Error getting HSN code:', error);
    return null;
  }
}

export async function getAllItemHSNMappings() {
  if (!(await isDbAvailable())) {
    return fallbackDb.getItemHSNCodes();
  }
  try {
    const { rows } = await sql`
      SELECT name, hsn_code 
      FROM items 
      WHERE hsn_code IS NOT NULL AND hsn_code != ''
      ORDER BY name
    `;
    console.log('✅ Retrieved HSN mappings:', rows.length, 'items');
    return rows;
  } catch (error) {
    console.error('Error getting HSN mappings:', error);
    return [];
  }
}

export async function updateItemHSN(itemName: string, hsnCode: string) {
  if (!(await isDbAvailable())) {
    return fallbackDb.setItemHSNCode(itemName, hsnCode);
  }
  
  console.log('✅ Saving HSN to database:', { itemName, hsnCode });
  await sql`
    UPDATE items 
    SET hsn_code = ${hsnCode}
    WHERE name = ${itemName}
  `;
  console.log('✅ HSN saved successfully');
}

export async function getItemHSN(itemName: string): Promise<string | null> {
  if (!(await isDbAvailable())) {
    return fallbackDb.getItemHSNCode(itemName);
  }
  
  try {
    const { rows } = await sql`
      SELECT hsn_code FROM items WHERE name = ${itemName}
    `;
    return rows.length > 0 ? (rows[0].hsn_code || null) : null;
  } catch (error) {
    console.error('Error getting item HSN:', error);
    return null;
  }
}

// Sources CRUD
export async function getSources() {
  if (!(await isDbAvailable())) return fallbackDb.getSources();
  const { rows } = await sql`SELECT name FROM sources ORDER BY name`;
  return rows.map(row => row.name);
}

export async function addSource(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.addSource(name);
  await sql`INSERT INTO sources (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

export async function removeSource(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.removeSource(name);
  await sql`DELETE FROM sources WHERE name = ${name}`;
  // Also remove associated suppliers
  await sql`DELETE FROM suppliers WHERE source_name = ${name}`;
}

// Suppliers CRUD
export async function getSuppliers() {
  if (!(await isDbAvailable())) return fallbackDb.getSuppliers();
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
  if (!(await isDbAvailable())) return fallbackDb.getSuppliersForSource(sourceName);
  const { rows } = await sql`
    SELECT supplier_name FROM suppliers WHERE source_name = ${sourceName} ORDER BY supplier_name
  `;
  return rows.map(row => row.supplier_name);
}

export async function addSupplier(sourceName: string, supplierName: string) {
  if (!(await isDbAvailable())) return fallbackDb.addSupplier(sourceName, supplierName);
  await sql`
    INSERT INTO suppliers (source_name, supplier_name) 
    VALUES (${sourceName}, ${supplierName}) 
    ON CONFLICT (source_name, supplier_name) DO NOTHING
  `;
}

export async function removeSupplier(supplierName: string) {
  if (!(await isDbAvailable())) return fallbackDb.removeSupplier(supplierName);
  await sql`DELETE FROM suppliers WHERE supplier_name = ${supplierName}`;
}

// Brands CRUD
export async function getBrands() {
  if (!(await isDbAvailable())) return fallbackDb.getBrands();
  const { rows } = await sql`SELECT name FROM brands ORDER BY name`;
  return rows.map(row => row.name);
}

export async function addBrand(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.addBrand(name);
  await sql`INSERT INTO brands (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

export async function removeBrand(name: string) {
  if (!(await isDbAvailable())) return fallbackDb.removeBrand(name);
  await sql`DELETE FROM brands WHERE name = ${name}`;
}

// Events CRUD
export async function getEvents() {
  if (!(await isDbAvailable())) return fallbackDb.getEvents();
  const { rows } = await sql`SELECT * FROM events ORDER BY timestamp DESC`;
  return rows as InventoryEvent[];
}

export async function addEvent(event: InventoryEvent) {
  if (!(await isDbAvailable())) return fallbackDb.addEvent(event);
  const brand = event.brand?.trim() || 'standard'; // Default to 'standard' if empty
  await sql`
    INSERT INTO events (id, timestamp, item, type, qty, rate, source, supplier, kind, brand)
    VALUES (${event.id}, ${event.timestamp}, ${event.item}, ${event.type}, ${event.qty}, ${event.rate}, ${event.source}, ${event.supplier}, ${event.kind}, ${brand})
  `;
}

export async function deleteEvent(id: string) {
  if (!(await isDbAvailable())) return fallbackDb.deleteEvent(id);
  await sql`DELETE FROM events WHERE id = ${id}`;
}

// Seed initial data
export async function seedInitialData() {
  // Skip seeding if database is unavailable - fallback handles its own init
  if (!(await isDbAvailable())) {
    return;
  }
  
  try {
    // Check if any standard types already exist (indicator that seeding was done)
    const { rows: typeRows } = await sql`SELECT COUNT(*) as count FROM types WHERE item_name = 'DCDB'`;
    
    if (typeRows[0].count > 0) {
      console.log('✅ Standard types already exist, skipping seed');
      return;
    }

    console.log('🌱 Seeding standard items and types for first-time setup...');

    // Add standard items (singular to match BOM calculations)
    const standardItems = {
      "DCDB": ["1 IN 1 OUT", "2 IN 2 OUT", "3 IN 3 OUT", "4 IN 4 OUT", "AS PER DESIGN"],
      "ACDB": ["32A", "63A"],
      "MCB": ["32A 2 POLE", "63A 2 POLE", "100A 2 POLE", "32A 4 POLE", "63A 4 POLE", "100A 4 POLE"],
      "ELCB": ["32A 2 POLE", "63A 2 POLE", "100A 2 POLE", "32A 4 POLE", "63A 4 POLE", "100A 4 POLE"],
      "Danger Plate": ["230V"],
      "Fire Cylinder Co2": ["1 KG"],
      "Copper Thimble for (ACDB)": ["Pin types 6mmsq"],
      "Copper Thimble for ( Earthing , Inverter, Structure)": ["Ring types 6mmsq"],
      "Copper Thimble for ( LA)": ["Ring types 16mmsq"],
      "AC wire": ["6 sq mm Armoured", "10 sq mm Armoured", "16 sq mm Armoured", "6 sq mm", "10 sq mm"],
      "AC wire Inverter to ACDB": ["2 CORE 6 SQ MM", "2 CORE 10 SQ MM", "4 CORE 4 SQ MM", "4 CORE 6 SQ MM"],
      "Dc wire Tin copper": ["4 sq mm", "6 sq mm"],
      "Earthing Wire": ["6 sq mm"],
      "LA Earthing Wire": ["16 sq mm"],
      "Earthing Pit Cover": ["STANDARD"],
      "LA": ["1 MTR"],
      "LA Fastner / LA": ["M6"],
      "Earthing Rod/Plate": ["1 MTR | COPPER COATING", "2 MTR | COPPER COATING"],
      "Earthing Chemical": ["CHEMICAL"],
      "Mc4 Connector": ["1000V"],
      "Cable Tie UV": ["200MM", "300MM"],
      "Screw": ["1.5 INCH"],
      "Gitti": ["1.5 INCH"],
      "Wire PVC Tape": ["RED, BLUE, GREEN", "RED, BLUE, BLACK, YELLOW"],
      "UPVC Pipe": ["20mm"],
      "UPVC Cable Tray": ["50*25"],
      "UPVC Shedal": ["20mm"],
      "GI Shedal": ["20mm"],
      "UPVC Tee Band": ["20mm"],
      "UPVC Elbow": ["20mm"],
      "Flexible Pipe": ["20mm"],
      "Structure Nut Bolt": ["M10*25"],
      "Thread Rod / Fastner": ["M10"],
      "Solar Panel": ["550W Mono", "600W Bifacial", "450W Poly"],
      "Inverter": ["5KW On-Grid", "10KW Hybrid", "15KW Three-Phase"]
    };

    // Add items and their types
    for (const [item, types] of Object.entries(standardItems)) {
      await addItem(item);
      for (const type of types) {
        await addType(item, type);
      }
    }

    // Add sample sources
    const sampleSources = ['Main Warehouse', 'Site Storage', 'Supplier Direct'];
    for (const source of sampleSources) {
      await addSource(source);
    }

    // Add sample suppliers
    await addSupplier('Main Warehouse', 'Solar Tech India');
    await addSupplier('Main Warehouse', 'Green Energy Corp');
    await addSupplier('Supplier Direct', 'Direct Solar Imports');

    console.log('✅ Standard items and types seeded successfully - ready for use!');
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// BOM CRUD
export async function getBOMRecords() {
  if (!(await isDbAvailable())) return fallbackDb.getBOMRecords();
  const result = await sql`SELECT * FROM bom ORDER BY created_at DESC;`;
  return result.rows as BOMRecord[];
}

export async function addBOMRecord(bom: BOMRecord) {
  if (!(await isDbAvailable())) return fallbackDb.addBOMRecord(bom);
  await sql`
    INSERT INTO bom (id, name, project_in_kw, wattage_of_panels, panel_name, table_option, phase, 
                     ac_wire, dc_wire, la_wire, earthing_wire, no_of_legs, 
                     front_leg, back_leg, roof_design, created_at)
    VALUES (${bom.id}, ${bom.name}, ${bom.project_in_kw}, ${bom.wattage_of_panels}, 
            ${bom.panel_name || null}, ${bom.table_option}, ${bom.phase}, ${bom.ac_wire || ''}, ${bom.dc_wire || ''}, 
            ${bom.la_wire || ''}, ${bom.earthing_wire || ''}, ${bom.no_of_legs || 0}, 
            ${bom.front_leg || ''}, ${bom.back_leg || ''}, ${bom.roof_design || ''}, ${bom.created_at});
  `;
}

export async function deleteBOMRecord(id: string) {
  if (!(await isDbAvailable())) return fallbackDb.deleteBOMRecord(id);
  await sql`DELETE FROM bom WHERE id = ${id};`;
}

export async function updateBOMRecord(id: string, updatedBOM: BOMRecord) {
  if (!(await isDbAvailable())) return fallbackDb.updateBOMRecord(id, updatedBOM);
  // Update the BOM record in the database
  await sql`
    UPDATE bom 
    SET 
      name = ${updatedBOM.name},
      project_in_kw = ${updatedBOM.project_in_kw},
      wattage_of_panels = ${updatedBOM.wattage_of_panels},
      panel_name = ${updatedBOM.panel_name || ''},
      table_option = ${updatedBOM.table_option},
      phase = ${updatedBOM.phase},
      ac_wire = ${updatedBOM.ac_wire},
      dc_wire = ${updatedBOM.dc_wire},
      la_wire = ${updatedBOM.la_wire},
      earthing_wire = ${updatedBOM.earthing_wire},
      no_of_legs = ${updatedBOM.no_of_legs},
      front_leg = ${updatedBOM.front_leg},
      back_leg = ${updatedBOM.back_leg},
      roof_design = ${updatedBOM.roof_design}
    WHERE id = ${id};
  `;
}
