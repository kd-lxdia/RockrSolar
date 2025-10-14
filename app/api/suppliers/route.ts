import { NextRequest, NextResponse } from 'next/server';
import { getSuppliers, addSupplier, removeSupplier } from '@/lib/db';

export async function GET() {
  try {
    const suppliers = await getSuppliers();
    return NextResponse.json({ success: true, data: suppliers });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { sourceName, supplierName } = await request.json();
    if (!sourceName || !supplierName) {
      return NextResponse.json(
        { success: false, error: 'sourceName and supplierName are required' },
        { status: 400 }
      );
    }
    await addSupplier(sourceName, supplierName);
    return NextResponse.json({ success: true, message: 'Supplier added successfully' });
  } catch (error) {
    console.error('Error adding supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add supplier' },
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
    await removeSupplier(name);
    return NextResponse.json({ success: true, message: 'Supplier removed successfully' });
  } catch (error) {
    console.error('Error removing supplier:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove supplier' },
      { status: 500 }
    );
  }
}
