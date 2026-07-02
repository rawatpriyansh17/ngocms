import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eventsTable } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { scheduleEmbeddingSync } from '@/lib/rag';

export async function GET() {
  try {
    const events = await db.select().from(eventsTable).orderBy(desc(eventsTable.createdAt));
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const [newEvent] = await db.insert(eventsTable).values(body).returning();
    scheduleEmbeddingSync({ sourceType: 'event', sourceId: newEvent.id });
    return NextResponse.json(newEvent, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}
