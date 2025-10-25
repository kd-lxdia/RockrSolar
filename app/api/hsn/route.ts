import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET - Get all HSN mappings
export async function GET() {
  try {
    const mappings = await db.getAllTypeHSNMappings();
    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    console.error('Error fetching HSN mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch HSN mappings' },
      { status: 500 }
    );
  }
}

// POST - Update HSN code for a type
export async function POST(request: Request) {
  try {
    const { itemName, typeName, hsnCode } = await request.json();
    
    if (!itemName || !typeName) {
      return NextResponse.json(
        { success: false, error: 'Item name and type name are required' },
        { status: 400 }
      );
    }

    await db.updateTypeHSN(itemName, typeName, hsnCode || '');
    
    return NextResponse.json({ 
      success: true, 
      message: 'HSN code updated successfully' 
    });
  } catch (error) {
    console.error('Error updating HSN code:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update HSN code' },
      { status: 500 }
    );
  }
}
