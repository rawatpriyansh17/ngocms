import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { latestEventTable } from '@/db/schema';

const LATEST_EVENT_ID = 1;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
  'Access-Control-Allow-Headers': 'Content-Type',
};

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
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching public latest event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest event' },
      { status: 500, headers }
    );
  }
}
