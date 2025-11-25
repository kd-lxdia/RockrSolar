import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-client';

interface DiagnosticsData {
  timestamp: string;
  environment: string | undefined;
  postgresUrl: string;
  postgresUrlPreview: string | undefined;
  database?: {
    status: string;
    version?: string;
    currentDatabase?: string;
    currentUser?: string;
    backendPid?: number;
    error?: string;
    code?: string;
  };
  tables?: string[];
  dataCounts?: Record<string, number | string>;
}

export async function GET() {
  try {
    const diagnostics: DiagnosticsData = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      postgresUrl: process.env.POSTGRES_URL ? '✅ Set (hidden for security)' : '❌ Not set',
      postgresUrlPreview: process.env.POSTGRES_URL?.replace(/:[^:@]*@/, ':****@').substring(0, 100),
    };

    // Test database connection
    try {
      const result = await pool.query('SELECT version(), current_database(), current_user, pg_backend_pid()');
      diagnostics.database = {
        status: '✅ Connected',
        version: result.rows[0].version.split(',')[0],
        currentDatabase: result.rows[0].current_database,
        currentUser: result.rows[0].current_user,
        backendPid: result.rows[0].pg_backend_pid,
      };

      // Check if tables exist
      const tables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      diagnostics.tables = tables.rows.map(r => r.table_name);

      // Count data in each table
      const counts: Record<string, number | string> = {};
      const tableNames = ['items', 'types', 'sources', 'suppliers', 'brands', 'events', 'bom', 'bom_edits'];
      for (const tableName of tableNames) {
        try {
          const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          counts[tableName] = parseInt(countResult.rows[0].count);
        } catch {
          counts[tableName] = `Table doesn't exist`;
        }
      }
      diagnostics.dataCounts = counts;

    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      diagnostics.database = {
        status: '❌ Connection failed',
        error: err.message,
        code: err.code,
      };
    }

    return NextResponse.json(diagnostics, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });
  } catch (error: unknown) {
    const err = error as { message?: string; stack?: string };
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500 }
    );
  }
}
