import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eventsTable, mediaTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    void request;
    const { slug } = await params;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug));

    if (!event) {
      const allEvents = await db.select({ slug: eventsTable.slug, id: eventsTable.id }).from(eventsTable);
      
      return NextResponse.json(
        { 
          error: 'Event not found',
          requestedSlug: slug,
          availableSlugs: allEvents.map(e => e.slug)
        }, 
        { status: 404, headers }
      );
    }

    if (!event.isActive) {
      return NextResponse.json(
        { 
          error: 'Event is not active',
          eventId: event.id,
          slug: event.slug
        }, 
        { status: 403, headers }
      );
    }

    const media = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.eventId, event.id))
      .orderBy(asc(mediaTable.order));

    const photos = media.filter(m => m.type === 'photo');
    const videos = media.filter(m => m.type === 'video');

    return NextResponse.json({
      event,
      photos,
      videos: {
        interviews: videos.filter(v => v.videoType === 'interview'),
        distributions: videos.filter(v => v.videoType === 'distribution')
      }
    }, { headers });

  } catch (error) {
    console.error('Error fetching public event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch event', details: errorMessage }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
