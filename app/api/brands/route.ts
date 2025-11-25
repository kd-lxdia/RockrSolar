import { NextRequest, NextResponse } from 'next/server';
import { getBrands, addBrand, removeBrand } from '@/lib/db';

export async function GET() {
  try {
    const brands = await getBrands();
    return NextResponse.json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch brands' },
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
    await addBrand(name);
    return NextResponse.json({ success: true, message: 'Brand added successfully' });
  } catch (error) {
    console.error('Error adding brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add brand' },
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
    await removeBrand(name);
    return NextResponse.json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete brand' },
      { status: 500 }
    );
  }
}
