import { NextRequest, NextResponse } from 'next/server';
import { getItems, addItem, removeItem } from '@/lib/db';

export async function GET() {
  try {
    const items = await getItems();
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    await addItem(name);
    return NextResponse.json({ success: true, message: 'Item added successfully' });
  } catch (error) {
    console.error('Error adding item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }
    await removeItem(name);
    return NextResponse.json({ success: true, message: 'Item removed successfully' });
  } catch (error) {
    console.error('Error removing item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove item' },
      { status: 500 }
    );
  }
}
