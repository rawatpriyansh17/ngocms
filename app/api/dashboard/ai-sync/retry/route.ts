import { NextResponse } from 'next/server';

import { getEmbeddingSyncStatus } from '@/lib/embedding-sync-status';
import { scheduleEmbeddingSync } from '@/lib/rag';

export async function POST() {
  scheduleEmbeddingSync({ sourceType: 'all' });

  return NextResponse.json(getEmbeddingSyncStatus());
}
