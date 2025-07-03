import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { eventsTable, mediaTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    console.log('Searching for event with slug:', slug); // Debug log

    // Get event by slug - Remove the isActive filter temporarily for debugging
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug));

    console.log('Found event:', event); // Debug log

    if (!event) {
      // Let's also try to find all events to see what slugs exist
      const allEvents = await db.select({ slug: eventsTable.slug, id: eventsTable.id }).from(eventsTable);
      console.log('All available event slugs:', allEvents); // Debug log
      
      return NextResponse.json(
        { 
          error: 'Event not found',
          requestedSlug: slug,
          availableSlugs: allEvents.map(e => e.slug)
        }, 
        { status: 404, headers }
      );
    }

    // Check if event is active
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

    // Get media for this event
    const media = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.eventId, event.id))
      .orderBy(asc(mediaTable.order));

    console.log('Found media for event:', media.length); // Debug log

    // Separate photos and videos
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

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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