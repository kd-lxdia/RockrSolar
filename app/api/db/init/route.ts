import { NextResponse } from 'next/server';
import { initDatabase, seedInitialData } from '@/lib/db';

export async function GET() {
  try {
    // Initialize database tables (safe - uses CREATE IF NOT EXISTS)
    await initDatabase();
    
    // Seed standard items and types (safe - only runs once, checks if DCDB types exist)
    await seedInitialData();
    
    return NextResponse.json({ success: true, message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
