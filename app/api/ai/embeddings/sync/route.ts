import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isInternalRequestAuthorized } from '@/lib/internal-auth';
import { getEmbeddingSyncStatus } from '@/lib/embedding-sync-status';
import { runEmbeddingSyncWithRetry } from '@/lib/rag';

export const runtime = 'nodejs';
export const maxDuration = 60;

const syncSchema = z.discriminatedUnion('sourceType', [
  z.object({ sourceType: z.literal('all') }),
  z.object({ sourceType: z.literal('post'), sourceId: z.number().int().positive() }),
  z.object({ sourceType: z.literal('event'), sourceId: z.number().int().positive() }),
  z.object({ sourceType: z.literal('media'), sourceId: z.number().int().positive() }),
  z.object({ sourceType: z.literal('latest_event'), sourceId: z.number().int().positive().optional() }),
  z.object({ sourceType: z.literal('site_fact'), sourceSlug: z.string().trim().min(1).optional() }),
]);

function getErrorStatus(error: unknown) {
  if (error instanceof z.ZodError) return 400;

  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }

  const lastError = typeof error === 'object' && error !== null && 'lastError' in error
    ? error.lastError
    : undefined;

  if (
    typeof lastError === 'object' &&
    lastError !== null &&
    'statusCode' in lastError &&
    typeof lastError.statusCode === 'number'
  ) {
    return lastError.statusCode;
  }

  return 400;
}

function getErrorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'Invalid embedding sync request';

  const status = getErrorStatus(error);
  if (status === 429) {
    return 'AI Gateway rate limit reached. Please wait and try again.';
  }

  if (status === 402) {
    return 'AI Gateway budget limit reached.';
  }

  return 'Failed to sync embeddings';
}

export async function POST(request: NextRequest) {
  if (!isInternalRequestAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const input = syncSchema.parse(await request.json());
    const result = await runEmbeddingSyncWithRetry(input);

    return NextResponse.json(result);
  } catch (error) {
    console.error('CMS embedding sync failed:', error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
        status: getEmbeddingSyncStatus(),
      },
      { status: getErrorStatus(error) }
    );
  }
}
