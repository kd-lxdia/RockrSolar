// Initialize database tables locally
const { Pool } = require('pg');

const pool = new Pool({
  host: 'database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com',
  port: 5432,
  database: 'RS',
  user: 'postgres',
  password: 'Solar235',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 5000
});

async function initDb() {
  console.log('🔌 Connecting to database to initialize tables...');
  
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS items (
        name VARCHAR(255) PRIMARY KEY,
        hsn_code VARCHAR(50)
      );
    `);
    console.log('✅ Created items table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS types (
        item_name VARCHAR(255) REFERENCES items(name) ON DELETE CASCADE,
        type_name VARCHAR(255),
        hsn_code VARCHAR(50),
        PRIMARY KEY (item_name, type_name)
      );
    `);
    console.log('✅ Created types table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sources (
        name VARCHAR(255) PRIMARY KEY
      );
    `);
    console.log('✅ Created sources table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        source_name VARCHAR(255) REFERENCES sources(name) ON DELETE CASCADE,
        supplier_name VARCHAR(255),
        PRIMARY KEY (source_name, supplier_name)
      );
    `);
    console.log('✅ Created suppliers table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS brands (
        name VARCHAR(255) PRIMARY KEY
      );
    `);
    console.log('✅ Created brands table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(50) PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        item VARCHAR(255) NOT NULL,
        type VARCHAR(255) NOT NULL,
        qty DECIMAL(10, 2) NOT NULL,
        rate DECIMAL(10, 2) NOT NULL,
        source VARCHAR(255) NOT NULL,
        supplier VARCHAR(255) NOT NULL,
        kind VARCHAR(10) NOT NULL,
        brand VARCHAR(255) DEFAULT 'standard'
      );
    `);
    console.log('✅ Created events table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bom (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        project_in_kw DECIMAL(10, 2) NOT NULL,
        wattage_of_panels DECIMAL(10, 2) NOT NULL,
        panel_name VARCHAR(255),
        table_option VARCHAR(50) NOT NULL,
        phase VARCHAR(10) NOT NULL,
        ac_wire VARCHAR(255),
        dc_wire VARCHAR(255),
        la_wire VARCHAR(255),
        earthing_wire VARCHAR(255),
        no_of_legs INTEGER,
        front_leg VARCHAR(255),
        back_leg VARCHAR(255),
        roof_design VARCHAR(255),
        created_at BIGINT NOT NULL
      );
    `);
    console.log('✅ Created bom table');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bom_edits (
        id VARCHAR(50) PRIMARY KEY,
        bom_id VARCHAR(50) REFERENCES bom(id) ON DELETE CASCADE,
        edited_data TEXT NOT NULL,
        updated_at BIGINT NOT NULL
      );
    `);
    console.log('✅ Created bom_edits table');

    console.log('🎉 Database initialized successfully!');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
  } finally {
    await pool.end();
  }
}

initDb();
