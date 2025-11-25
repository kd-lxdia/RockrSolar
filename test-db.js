// Test database connection
import { sql } from './lib/db-client';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    console.log('POSTGRES_URL exists:', !!process.env.POSTGRES_URL);
    
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Database connected successfully!');
    console.log('Current time:', result.rows[0].current_time);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    // Test if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 Existing tables:', tables.rows.map(r => r.table_name));
    
    // Count data in key tables
    try {
      const itemCount = await sql`SELECT COUNT(*) as count FROM items`;
      const eventCount = await sql`SELECT COUNT(*) as count FROM events`;
      const bomCount = await sql`SELECT COUNT(*) as count FROM bom`;
      
      console.log('📈 Data counts:');
      console.log('  - Items:', itemCount.rows[0].count);
      console.log('  - Events:', eventCount.rows[0].count);
      console.log('  - BOMs:', bomCount.rows[0].count);
    } catch (e) {
      console.log('⚠️ Tables might not exist yet');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error:', error);
    console.error('\n💡 Possible issues:');
    console.error('1. RDS security group not allowing your IP');
    console.error('2. Incorrect connection string');
    console.error('3. Database credentials invalid');
    console.error('4. SSL configuration issue');
  }
}

testConnection();
