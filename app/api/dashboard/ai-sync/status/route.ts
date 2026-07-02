import { NextResponse } from 'next/server';

import { getEmbeddingSyncStatus } from '@/lib/embedding-sync-status';

export async function GET() {
  return NextResponse.json(getEmbeddingSyncStatus());
}
