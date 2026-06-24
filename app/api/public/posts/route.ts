import { NextResponse } from 'next/server';
import { db } from '@/db';
import { postsTable } from '@/db/schema';
import { asc, count, eq } from 'drizzle-orm';

const DEFAULT_PAGE_SIZE = 8;
const MAX_PAGE_SIZE = 24;

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request) {
  try {
    const headers = {
      'Access-Control-Allow-Origin': '*', // Allow all origins for now
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    const { searchParams } = new URL(request.url);
    const requestedPage = getPositiveInteger(searchParams.get('page'), 1);
    const requestedPageSize = getPositiveInteger(
      searchParams.get('pageSize'),
      DEFAULT_PAGE_SIZE
    );
    const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE);

    const [{ total }] = await db
      .select({ total: count() })
      .from(postsTable)
      .where(eq(postsTable.isActive, true));

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const posts = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.isActive, true))
      .orderBy(asc(postsTable.order))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    return NextResponse.json(
      {
        posts,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
      { headers }
    );
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
