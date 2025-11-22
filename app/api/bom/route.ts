import { NextRequest, NextResponse } from 'next/server';
import { getBOMRecords, addBOMRecord, deleteBOMRecord, type BOMRecord } from '@/lib/db';

export async function GET() {
  try {
    const records = await getBOMRecords();
    return NextResponse.json({ success: true, data: records || [] });
  } catch (error) {
    console.error('Error fetching BOM records:', error);
    // Return empty array instead of error to prevent UI crashes
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const bom: BOMRecord = await request.json();
    
    // Validate required fields (allow 0 values for custom BOMs)
    if (!bom.name || bom.project_in_kw === undefined || !bom.phase) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // For non-custom BOMs, require wattage_of_panels
    if (bom.table_option !== 'Custom' && !bom.wattage_of_panels) {
      return NextResponse.json(
        { success: false, error: 'Wattage of panels is required for non-custom BOMs' },
        { status: 400 }
      );
    }
    
    // Ensure we have an ID and timestamp
    if (!bom.id) {
      bom.id = `bom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!bom.created_at) {
      bom.created_at = Date.now();
    }
    
    await addBOMRecord(bom);
    return NextResponse.json({ success: true, message: 'BOM record added successfully', data: bom });
  } catch (error) {
    console.error('Error adding BOM record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add BOM record' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    await deleteBOMRecord(id);
    return NextResponse.json({ success: true, message: 'BOM record deleted successfully' });
  } catch (error) {
    console.error('Error deleting BOM record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete BOM record' },
      { status: 500 }
    );
  }
}
