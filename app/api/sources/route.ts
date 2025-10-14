import { NextRequest, NextResponse } from 'next/server';
import { getSources, addSource, removeSource } from '@/lib/db';

export async function GET() {
  try {
    const sources = await getSources();
    return NextResponse.json({ success: true, data: sources });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sources' },
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
    await addSource(name);
    return NextResponse.json({ success: true, message: 'Source added successfully' });
  } catch (error) {
    console.error('Error adding source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add source' },
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
    await removeSource(name);
    return NextResponse.json({ success: true, message: 'Source removed successfully' });
  } catch (error) {
    console.error('Error removing source:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove source' },
      { status: 500 }
    );
  }
}
