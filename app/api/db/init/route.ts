import { NextRequest, NextResponse } from 'next/server';
import { initDatabase, seedInitialData } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    await initDatabase();
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
