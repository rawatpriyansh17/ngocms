import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eventsTable, mediaTable } from '@/db/schema';
import { eq, desc, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const headers = {
      'Access-Control-Allow-Origin': 'https://sitaramsevasansthan.org',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const events = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.isActive, true))
      .orderBy(desc(eventsTable.createdAt));

    return NextResponse.json(events, { headers });
  } catch (error) {
    console.error('Error fetching public events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' }, 
      { status: 500 }
    );
  }
}