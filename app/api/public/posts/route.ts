import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { postsTable } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';

export async function GET() {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*', // Allow all origins for now
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    const posts = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.isActive, true))
      .orderBy(asc(postsTable.order));

    return NextResponse.json(posts, { headers });
  } catch (error) {
    console.error('Error fetching public posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' }, 
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