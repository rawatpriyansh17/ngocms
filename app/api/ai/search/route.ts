import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isInternalRequestAuthorized } from '@/lib/internal-auth';
import { searchContentEmbeddings } from '@/lib/rag';

export const runtime = 'nodejs';

const searchSchema = z.object({
  query: z.string().trim().min(1).max(1000),
  topK: z.number().int().min(1).max(10).optional(),
});

export async function POST(request: NextRequest) {
  if (!isInternalRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = searchSchema.parse(await request.json());
    const results = await searchContentEmbeddings(body.query, body.topK);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('CMS AI search failed:', error);
    const message =
      error instanceof z.ZodError
        ? 'Invalid search request'
        : 'Failed to search content';

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
