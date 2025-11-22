import { NextResponse } from 'next/server';
import * as db from '@/lib/db';

// GET - Get all HSN mappings (item level)
export async function GET() {
  try {
    const mappings = await db.getAllItemHSNMappings();
    return NextResponse.json({ success: true, data: mappings });
  } catch (error) {
    console.error('Error fetching HSN mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch HSN mappings' },
      { status: 500 }
    );
  }
}

// POST - Update HSN code for an item
export async function POST(request: Request) {
  try {
    const { itemName, hsnCode } = await request.json();
    
    if (!itemName) {
      return NextResponse.json(
        { success: false, error: 'Item name is required' },
        { status: 400 }
      );
    }

    await db.updateItemHSN(itemName, hsnCode || '');
    
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
