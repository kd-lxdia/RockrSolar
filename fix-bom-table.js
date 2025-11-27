// Add missing columns to BOM table
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

async function fixBomTable() {
  console.log('🔌 Connecting to database to fix BOM table...');
  
  try {
    // Add customer_name column if it doesn't exist
    await pool.query(`
      ALTER TABLE bom ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
    `);
    console.log('✅ Added customer_name column');

    // Add address column if it doesn't exist
    await pool.query(`
      ALTER TABLE bom ADD COLUMN IF NOT EXISTS address TEXT;
    `);
    console.log('✅ Added address column');

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bom' 
      ORDER BY ordinal_position;
    `);
    console.log('\n📋 BOM table columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    console.log('\n🎉 BOM table fixed successfully!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
  } finally {
    await pool.end();
  }
}

fixBomTable();
