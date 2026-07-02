import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { mediaTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.eventId, parseInt(id)))
      .orderBy(asc(mediaTable.order));
    
    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Failed to fetch media' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const mediaData = {
      ...body,
      eventId: parseInt(id)
    };
    
    const [newMedia] = await db.insert(mediaTable).values(mediaData).returning();
    return NextResponse.json(newMedia, { status: 201 });
  } catch (error) {
    console.error('Error creating media:', error);
    return NextResponse.json({ error: 'Failed to create media' }, { status: 500 });
  }
}
