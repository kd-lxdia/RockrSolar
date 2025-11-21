// Database client wrapper for AWS RDS PostgreSQL
import { Pool } from 'pg';

// Create a PostgreSQL connection pool with faster timeout for production
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Increased from 2s to 5s
  query_timeout: 10000, // 10s query timeout
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
