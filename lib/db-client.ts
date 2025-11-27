// Database client wrapper for AWS RDS PostgreSQL
import { Pool } from 'pg';

// Parse connection string and remove sslmode parameter to avoid conflicts
const connectionString = process.env.POSTGRES_URL?.replace(/[?&]sslmode=[^&]*/gi, '') || '';

// Create a PostgreSQL connection pool with faster timeout for production
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 10000,
});

// SQL template tag function that mimics @vercel/postgres
export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  // Convert template literal to parameterized query
  let text = '';
  const params: unknown[] = [];
  
  strings.forEach((str, i) => {
    text += str;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });

  return pool.query(text, params);
}

// Export pool for direct access if needed
export { pool };
