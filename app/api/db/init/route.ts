import { NextResponse } from 'next/server';
import { initDatabase, seedInitialData } from '@/lib/db';

export async function GET() {
  try {
    // Only allow initialization, not seeding, to protect existing data
    await initDatabase();
    
    // NEVER seed in production - only create tables
    if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL && !process.env.AWS_REGION) {
      await seedInitialData();
      return NextResponse.json({ success: true, message: 'Database initialized and seeded successfully (development only)' });
    }
    
    return NextResponse.json({ success: true, message: 'Database tables initialized successfully (seeding skipped in production)' });
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
