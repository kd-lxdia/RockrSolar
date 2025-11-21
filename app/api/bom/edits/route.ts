import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function PUT(request: NextRequest) {
  try {
    const { bomId, bomRows } = await request.json();
    
    if (!bomId || !bomRows) {
      return NextResponse.json(
        { success: false, error: 'Missing bomId or bomRows' },
        { status: 400 }
      );
    }

    // Save the edited BOM rows to database
    await sql`
      DELETE FROM bom_edits WHERE bom_id = ${bomId};
    `;

    await sql`
      INSERT INTO bom_edits (bom_id, edited_data, updated_at)
      VALUES (${bomId}, ${JSON.stringify(bomRows)}, ${Date.now()});
    `;

    console.log(`✅ Auto-saved BOM edits for ${bomId}`);
    
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

    const result = await sql`
      SELECT edited_data, updated_at FROM bom_edits 
      WHERE bom_id = ${bomId} 
      ORDER BY updated_at DESC 
      LIMIT 1;
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: null,
        message: 'No edits found' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: JSON.parse(result.rows[0].edited_data),
      updatedAt: result.rows[0].updated_at
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

    await sql`DELETE FROM bom_edits WHERE bom_id = ${bomId};`;

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