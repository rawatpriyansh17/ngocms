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
      'Access-Control-Allow-Origin': 'https://sitaramsevasansthan.org',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Get event by slug
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug));

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' }, 
        { status: 404, headers }
      );
    }

    // Get media for this event
    const media = await db
      .select()
      .from(mediaTable)
      .where(eq(mediaTable.eventId, event.id))
      .orderBy(asc(mediaTable.order));

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
    return NextResponse.json(
      { error: 'Failed to fetch event' }, 
      { status: 500 }
    );
  }
}