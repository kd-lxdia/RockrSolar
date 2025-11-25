// Test connection to new RDS database
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

async function testConnection() {
  console.log('🔌 Testing connection to NEW database...');
  console.log('Host: database-1.cl42qg2ok5a2.ap-south-1.rds.amazonaws.com');
  console.log('Database: RS');
  console.log('User: postgres');
  console.log('');

  try {
    const result = await pool.query('SELECT version(), current_database(), current_user');
    console.log('✅ Connection successful!');
    console.log('PostgreSQL Version:', result.rows[0].version);
    console.log('Current Database:', result.rows[0].current_database);
    console.log('Current User:', result.rows[0].current_user);
    console.log('');

    // Check if tables exist
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log('📋 Existing tables:');
      tables.rows.forEach(row => console.log('  -', row.table_name));
    } else {
      console.log('📋 No tables found - database is empty (this is normal for a new database)');
    }
    console.log('');

    // Count data in tables if they exist
    const tableNames = ['items', 'types', 'sources', 'suppliers', 'brands', 'events', 'bom'];
    for (const tableName of tableNames) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`📊 ${tableName}: ${count.rows[0].count} records`);
      } catch (e) {
        console.log(`📊 ${tableName}: table doesn't exist yet`);
      }
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('');
    console.error('Possible reasons:');
    console.error('1. Security group not allowing your IP');
    console.error('2. Database credentials incorrect');
    console.error('3. Database not publicly accessible');
    console.error('4. Network/firewall blocking connection');
  } finally {
    await pool.end();
  }
}

testConnection();
