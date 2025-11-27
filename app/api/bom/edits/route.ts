import { NextRequest, NextResponse } from 'next/server';
import { saveBOMEdits, getBOMEdits, deleteBOMEdits } from '@/lib/db';

// In-memory fallback storage for BOM edits (used when database unavailable)
const bomEditsStore = new Map<string, { data: unknown; timestamp: number }>();

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const bomId = body.bomId;
    const bomRows = body.data || body.bomRows; // Support both 'data' and 'bomRows'
    
    if (!bomId || !bomRows) {
      return NextResponse.json(
        { success: false, error: 'Missing bomId or bomRows' },
        { status: 400 }
      );
    }

    // Try to save to database first
    try {
      await saveBOMEdits(bomId, bomRows);
      console.log(`✅ Saved BOM edits to database for ${bomId}`);
    } catch (dbError) {
      console.log('Database save failed, using fallback:', dbError);
      // Fallback to in-memory store
      bomEditsStore.set(bomId, {
        data: bomRows,
        timestamp: Date.now()
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'BOM edits saved successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving BOM edits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save BOM edits' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get('bomId');
    
    if (!bomId) {
      return NextResponse.json(
        { success: false, error: 'Missing bomId' },
        { status: 400 }
      );
    }

    // Try to get from database first
    try {
      const dbResult = await getBOMEdits(bomId);
      if (dbResult) {
        return NextResponse.json({ 
          success: true, 
          data: dbResult.data,
          timestamp: dbResult.timestamp,
          updatedAt: dbResult.timestamp
        });
      }
    } catch (dbError) {
      console.log('Database read failed, checking fallback:', dbError);
    }

    // Fallback to in-memory store
    const stored = bomEditsStore.get(bomId);

    if (!stored) {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: 'No edits found' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: stored.data,
      updatedAt: stored.timestamp
    });
  } catch (error) {
    console.error('Error loading BOM edits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load BOM edits' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { bomId } = await request.json();
    
    if (!bomId) {
      return NextResponse.json(
        { success: false, error: 'Missing bomId' },
        { status: 400 }
      );
    }

    // Delete from both database and in-memory store
    try {
      await deleteBOMEdits(bomId);
    } catch (dbError) {
      console.log('Database delete failed:', dbError);
    }
    bomEditsStore.delete(bomId);

    console.log(`✅ Cleared BOM edits for ${bomId}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'BOM edits cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing BOM edits:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear BOM edits' },
      { status: 500 }
    );
  }
}