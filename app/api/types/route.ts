import { NextRequest, NextResponse } from 'next/server';
import { getTypes, addType, removeType } from '@/lib/db';

export async function GET() {
  try {
    const types = await getTypes();
    return NextResponse.json({ success: true, data: types });
  } catch (error) {
    console.error('Error fetching types:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { itemName, typeName, hsnCode } = await request.json();
    if (!itemName || !typeName) {
      return NextResponse.json(
        { success: false, error: 'itemName and typeName are required' },
        { status: 400 }
      );
    }
    await addType(itemName, typeName, hsnCode);
    return NextResponse.json({ success: true, message: 'Type added successfully' });
  } catch (error) {
    console.error('Error adding type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemName = searchParams.get('itemName');
    const typeName = searchParams.get('typeName');
    if (!itemName || !typeName) {
      return NextResponse.json(
        { success: false, error: 'itemName and typeName are required' },
        { status: 400 }
      );
    }
    await removeType(itemName, typeName);
    return NextResponse.json({ success: true, message: 'Type removed successfully' });
  } catch (error) {
    console.error('Error removing type:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove type' },
      { status: 500 }
    );
  }
}
