import { NextRequest, NextResponse } from 'next/server';
import { getEvents, addEvent, deleteEvent } from '@/lib/db';
import type { InventoryEvent } from '@/lib/db';

export async function GET() {
  try {
    const events = await getEvents();
    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const event: InventoryEvent = await request.json();
    if (!event.item || !event.type || !event.qty || !event.rate || !event.source || !event.supplier || !event.kind) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Ensure we have an ID and timestamp
    if (!event.id) {
      event.id = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    await addEvent(event);
    return NextResponse.json({ success: true, message: 'Event added successfully', data: event });
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add event' },
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
    await deleteEvent(id);
    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
