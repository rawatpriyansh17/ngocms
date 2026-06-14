import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { latestEventTable } from '@/db/schema';

const LATEST_EVENT_ID = 1;

export async function GET() {
  try {
    const [latestEvent] = await db
      .select()
      .from(latestEventTable)
      .where(eq(latestEventTable.id, LATEST_EVENT_ID));

    return NextResponse.json(
      latestEvent ?? {
        id: LATEST_EVENT_ID,
        imageUrl: '',
        imageAlt: 'Upcoming program flyer',
        isActive: false,
      }
    );
  } catch (error) {
    console.error('Error fetching latest event:', error);
    return NextResponse.json({ error: 'Failed to fetch latest event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const values = {
      id: LATEST_EVENT_ID,
      imageUrl: body.imageUrl || '',
      imageAlt: body.imageAlt || 'Upcoming program flyer',
      isActive: Boolean(body.isActive),
      updatedAt: new Date().toISOString(),
    };

    const existing = await db
      .select({ id: latestEventTable.id })
      .from(latestEventTable)
      .where(eq(latestEventTable.id, LATEST_EVENT_ID));

    if (existing.length > 0) {
      const [updated] = await db
        .update(latestEventTable)
        .set(values)
        .where(eq(latestEventTable.id, LATEST_EVENT_ID))
        .returning();

      return NextResponse.json(updated);
    }

    const [created] = await db
      .insert(latestEventTable)
      .values(values)
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error updating latest event:', error);
    return NextResponse.json({ error: 'Failed to update latest event' }, { status: 500 });
  }
}
