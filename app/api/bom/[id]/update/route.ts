import { NextRequest, NextResponse } from 'next/server';
import { getBOMRecords, updateBOMRecord } from '@/lib/db';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { rows } = body;

    if (!rows || !Array.isArray(rows)) {
      return NextResponse.json(
        { success: false, error: 'Invalid rows data' },
        { status: 400 }
      );
    }

    // Get existing BOM
    const records = await getBOMRecords();
    const existingBOM = records.find(r => r.id === id);

    if (!existingBOM) {
      return NextResponse.json(
        { success: false, error: 'BOM not found' },
        { status: 404 }
      );
    }

    // Update the BOM record with new rows
    const updatedBOM = {
      ...existingBOM,
      bom_rows: rows,
      updated_at: Date.now()
    };

    await updateBOMRecord(id, updatedBOM);

    console.log('✅ BOM updated successfully:', id);
    
    return NextResponse.json({ 
      success: true,
      message: 'BOM updated successfully'
    });

  } catch (error) {
    console.error('Error updating BOM:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
