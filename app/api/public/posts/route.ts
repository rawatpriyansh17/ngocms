import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { postsTable } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Add CORS headers for your live website
    const headers = {
      'Access-Control-Allow-Origin': 'https://sitaramsevasansthan.org',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    const posts = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.isActive, true))
      .orderBy(desc(postsTable.order));

    return NextResponse.json(posts, { headers });
  } catch (error) {
    console.error('Error fetching public posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' }, 
      { status: 500 }
    );
  }
}