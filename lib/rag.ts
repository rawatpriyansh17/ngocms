import { createHash } from 'crypto';
import { embed, embedMany } from 'ai';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  contentEmbeddingsTable,
  eventsTable,
  latestEventTable,
  mediaTable,
  postsTable,
} from '@/db/schema';
import {
  markEmbeddingSyncFailed,
  markEmbeddingSyncStarted,
  markEmbeddingSyncSuccess,
} from '@/lib/embedding-sync-status';

export const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const PUBLIC_SITE_URL = 'https://sitaramsevasansthan.org';
const MAX_CHUNK_LENGTH = 1800;
const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 10;
const EMBEDDING_MAX_RETRIES = 0;
const SYNC_MAX_ATTEMPTS = 1;

type SourceType = 'post' | 'event' | 'media' | 'latest_event' | 'site_fact';

type RagDocument = {
  sourceType: SourceType;
  sourceId: number | null;
  sourceSlug: string | null;
  title: string;
  content: string;
  url: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
};

type SearchRow = {
  id: number;
  sourceType: SourceType;
  sourceId: number | null;
  sourceSlug: string | null;
  title: string;
  content: string;
  url: string;
  metadata: string;
  distance: number;
};

export type RagSearchResult = {
  id: number;
  sourceType: SourceType;
  sourceId: number | null;
  sourceSlug: string | null;
  title: string;
  content: string;
  url: string;
  metadata: Record<string, unknown>;
  score: number;
};

type SyncSourceInput =
  | { sourceType: Exclude<SourceType, 'site_fact' | 'latest_event'>; sourceId: number }
  | { sourceType: 'latest_event'; sourceId?: number }
  | { sourceType: 'site_fact'; sourceSlug?: string };

const siteFacts: RagDocument[] = [
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'mission',
    title: 'Mission and motto',
    content:
      'Sitaram Seva Sansthan works with the motto Seva se Samadhan, meaning finding solutions through service. The organization supports awareness, education, timely care, and dignity for people who need help.',
    url: `${PUBLIC_SITE_URL}/about`,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'services',
    title: 'Services and programs',
    content:
      'Sitaram Seva Sansthan supports breast cancer aid, chemotherapy medicine aid, ovarian cancer care, Pap smear test camps, oral cancer screening camps, blood donation and health check-up camps, essential supplies for government school students, and free thermal mammography test programs.',
    url: `${PUBLIC_SITE_URL}/#services`,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'donation',
    title: 'Donation options',
    content:
      'Visitors can donate online through Razorpay on the donate page, scan the UPI QR code, or use bank transfer details. Razorpay opens only after the visitor clicks Pay Securely on the donation form.',
    url: `${PUBLIC_SITE_URL}/donate/#donate-checkout`,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'bank-details',
    title: 'Bank details for donations',
    content:
      'Donation bank details: Account Name सीताराम सेवा संस्थान, Account Number 50100749971577, IFSC HDFC0001240, Bank HDFC Bank, Branch Janjeerwala Chouraha Branch, Indore.',
    url: `${PUBLIC_SITE_URL}/donate/#bank-details`,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'contact',
    title: 'Contact details',
    content:
      'Contact Sitaram Seva Sansthan at +91 9111311301 or sansthansitaramseva@gmail.com. Address: 110, Shreyansnath Apartment 3/2, Near Shalby Hospital, Dr R.S. Bhandari Marg, Indore, Madhya Pradesh, India.',
    url: `${PUBLIC_SITE_URL}/#bottom-of-page`,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'navigation',
    title: 'Website navigation',
    content:
      'Important website pages are Home, About Us, Latest Programs, Upcoming Programs, Donate, and Contact. Event details are available at /events/[slug].',
    url: PUBLIC_SITE_URL,
    isActive: true,
  },
  {
    sourceType: 'site_fact',
    sourceId: null,
    sourceSlug: 'latest-event',
    title: 'Upcoming program page',
    content:
      'The Upcoming Programs page shows the current active flyer from the CMS. If no latest event is active, the website displays that there is no upcoming program right now and asks visitors to check back soon or contact the organization.',
    url: `${PUBLIC_SITE_URL}/latest-event`,
    isActive: true,
  },
];

function getErrorStatusCode(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    return error.statusCode;
  }

  const lastError =
    typeof error === 'object' && error !== null && 'lastError' in error
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

  return undefined;
}

function isRateLimitError(error: unknown) {
  return getErrorStatusCode(error) === 429;
}

function ensureGatewayEnv() {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY; 

  if (gatewayKey && !process.env.AI_GATEWAY_API_KEY) {
    process.env.AI_GATEWAY_API_KEY = gatewayKey;
  }

  if (!gatewayKey && !process.env.VERCEL_OIDC_TOKEN) {
    throw new Error('AI Gateway credentials are missing.');
  }
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function hashText(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function compactUrl(path: string) {
  if (path.startsWith('http')) return path;
  return `${PUBLIC_SITE_URL}${path}`;
}

function chunkText(text: string) {
  const normalized = normalizeText(text);

  if (normalized.length <= MAX_CHUNK_LENGTH) {
    return [normalized];
  }

  const chunks: string[] = [];
  let remaining = normalized;

  while (remaining.length > MAX_CHUNK_LENGTH) {
    const breakpoint = remaining.lastIndexOf('. ', MAX_CHUNK_LENGTH);
    const splitAt = breakpoint > 600 ? breakpoint + 1 : MAX_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

function serializeDocument(document: RagDocument, chunk: string) {
  return [
    `Title: ${document.title}`,
    `Source: ${document.sourceType}`,
    document.sourceSlug ? `Slug: ${document.sourceSlug}` : '',
    `Content: ${chunk}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function sourceCondition(document: Pick<RagDocument, 'sourceType' | 'sourceId' | 'sourceSlug'>) {
  if (document.sourceId !== null) {
    return and(
      eq(contentEmbeddingsTable.sourceType, document.sourceType),
      eq(contentEmbeddingsTable.sourceId, document.sourceId)
    );
  }

  return and(
    eq(contentEmbeddingsTable.sourceType, document.sourceType),
    isNull(contentEmbeddingsTable.sourceId),
    eq(contentEmbeddingsTable.sourceSlug, document.sourceSlug ?? '')
  );
}

async function deactivateSource(document: Pick<RagDocument, 'sourceType' | 'sourceId' | 'sourceSlug'>) {
  await db
    .update(contentEmbeddingsTable)
    .set({ isActive: false, updatedAt: new Date().toISOString() })
    .where(sourceCondition(document));
}

async function replaceSourceEmbeddings(document: RagDocument) {
  const chunks = chunkText(document.content);
  const sourceHash = hashText(
    JSON.stringify({
      title: document.title,
      content: document.content,
      url: document.url,
      metadata: document.metadata ?? {},
    })
  );

  const existing = await db
    .select({ id: contentEmbeddingsTable.id })
    .from(contentEmbeddingsTable)
    .where(
      and(
        sourceCondition(document),
        eq(contentEmbeddingsTable.sourceHash, sourceHash)
      )
    );

  if (existing.length === chunks.length) {
    await db
      .update(contentEmbeddingsTable)
      .set({ isActive: true, updatedAt: new Date().toISOString() })
      .where(inArray(contentEmbeddingsTable.id, existing.map((row) => row.id)));

    return { inserted: 0, skipped: chunks.length };
  }

  await db
    .delete(contentEmbeddingsTable)
    .where(sourceCondition(document));

  if (!document.isActive || chunks.length === 0) {
    return { inserted: 0, skipped: 0 };
  }

  ensureGatewayEnv();

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks.map((chunk) => serializeDocument(document, chunk)),
    maxRetries: EMBEDDING_MAX_RETRIES,
    maxParallelCalls: 1,
  });

  for (const [index, embedding] of embeddings.entries()) {
    await db.run(sql`
      INSERT INTO content_embeddings (
        source_type,
        source_id,
        source_slug,
        chunk_index,
        source_hash,
        title,
        content,
        url,
        metadata,
        is_active,
        embedding,
        created_at,
        updated_at
      )
      VALUES (
        ${document.sourceType},
        ${document.sourceId},
        ${document.sourceSlug},
        ${index},
        ${sourceHash},
        ${document.title},
        ${chunks[index]},
        ${document.url},
        ${JSON.stringify(document.metadata ?? {})},
        ${document.isActive ? 1 : 0},
        vector32(${JSON.stringify(embedding)}),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `);
  }

  return { inserted: embeddings.length, skipped: 0 };
}

async function getPostDocuments(sourceId?: number): Promise<RagDocument[]> {
  const rows = sourceId
    ? await db.select().from(postsTable).where(eq(postsTable.id, sourceId))
    : await db.select().from(postsTable).orderBy(asc(postsTable.order));

  return rows.map((post) => ({
    sourceType: 'post',
    sourceId: post.id,
    sourceSlug: post.eventPageSlug ?? `post-${post.id}`,
    title: normalizeText(post.title_en),
    content: [
      normalizeText(post.title_en),
      normalizeText(post.description_en),
      post.eventPageSlug ? `Related event page: ${compactUrl(`/events/${post.eventPageSlug}`)}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    url: post.eventPageSlug ? compactUrl(`/events/${post.eventPageSlug}`) : `${PUBLIC_SITE_URL}/#posts-section-title`,
    metadata: { mediaType: post.mediaType, order: post.order },
    isActive: Boolean(post.isActive),
  }));
}

async function getEventDocuments(sourceId?: number): Promise<RagDocument[]> {
  const rows = sourceId
    ? await db.select().from(eventsTable).where(eq(eventsTable.id, sourceId))
    : await db.select().from(eventsTable).orderBy(asc(eventsTable.createdAt));

  return rows.map((event) => ({
    sourceType: 'event',
    sourceId: event.id,
    sourceSlug: event.slug,
    title: normalizeText(event.heading_en),
    content: [
      normalizeText(event.heading_en),
      normalizeText(event.description1_en),
      normalizeText(event.description2_en),
      normalizeText(event.photoSubheading_en),
      normalizeText(event.videoSubheading_en),
    ]
      .filter(Boolean)
      .join('\n'),
    url: compactUrl(`/events/${event.slug}`),
    metadata: { slug: event.slug },
    isActive: Boolean(event.isActive),
  }));
}

async function getMediaDocuments(sourceId?: number): Promise<RagDocument[]> {
  const mediaRows = sourceId
    ? await db.select().from(mediaTable).where(eq(mediaTable.id, sourceId))
    : await db.select().from(mediaTable).orderBy(asc(mediaTable.order));

  const eventIds = [...new Set(mediaRows.map((media) => media.eventId).filter((id): id is number => id !== null))];
  const events = eventIds.length
    ? await db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds))
    : [];
  const eventsById = new Map(events.map((event) => [event.id, event]));

  return mediaRows.map((media) => {
    const event = media.eventId ? eventsById.get(media.eventId) : undefined;
    const title = normalizeText(media.heading_en) || `${event?.heading_en ?? 'Event'} ${media.type}`;

    return {
      sourceType: 'media',
      sourceId: media.id,
      sourceSlug: event?.slug ?? `media-${media.id}`,
      title,
      content: [
        title,
        normalizeText(media.description_en),
        event ? `Part of event: ${normalizeText(event.heading_en)}` : '',
        media.videoType ? `Video type: ${media.videoType}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      url: event ? compactUrl(`/events/${event.slug}`) : `${PUBLIC_SITE_URL}/#posts-section-title`,
      metadata: { type: media.type, videoType: media.videoType, eventId: media.eventId },
      isActive: Boolean(event?.isActive),
    } satisfies RagDocument;
  });
}

async function getLatestEventDocuments(): Promise<RagDocument[]> {
  const [latestEvent] = await db
    .select()
    .from(latestEventTable)
    .where(eq(latestEventTable.id, 1));

  if (!latestEvent) {
    return [];
  }

  return [
    {
      sourceType: 'latest_event',
      sourceId: latestEvent.id,
      sourceSlug: 'latest-event',
      title: 'Upcoming program flyer',
      content: [
        'Upcoming program flyer shown on the website.',
        normalizeText(latestEvent.imageAlt),
        latestEvent.isActive
          ? 'There is an active upcoming program.'
          : 'There is no upcoming program right now.',
      ].join('\n'),
      url: compactUrl('/latest-event'),
      metadata: { imageUrl: latestEvent.imageUrl },
      isActive: Boolean(latestEvent.isActive),
    },
  ];
}

async function getDocuments(input: SyncSourceInput | { sourceType: 'all' }): Promise<RagDocument[]> {
  if (input.sourceType === 'post') return getPostDocuments(input.sourceId);
  if (input.sourceType === 'event') return getEventDocuments(input.sourceId);
  if (input.sourceType === 'media') return getMediaDocuments(input.sourceId);
  if (input.sourceType === 'latest_event') return getLatestEventDocuments();
  if (input.sourceType === 'site_fact') {
    return input.sourceSlug ? siteFacts.filter((fact) => fact.sourceSlug === input.sourceSlug) : siteFacts;
  }

  const [posts, events, latestEvent] = await Promise.all([
    getPostDocuments(),
    getEventDocuments(),
    getLatestEventDocuments(),
  ]);

  return [...posts, ...events, ...latestEvent, ...siteFacts];
}

export async function syncContentEmbeddings(
  input: SyncSourceInput | { sourceType: 'all' },
  options: { attempt?: number; maxAttempts?: number } = {}
) {
  markEmbeddingSyncStarted({
    sourceType: input.sourceType,
    sourceId: 'sourceId' in input ? input.sourceId : undefined,
    sourceSlug: 'sourceSlug' in input ? input.sourceSlug : undefined,
    attempt: options.attempt ?? 1,
    maxAttempts: options.maxAttempts ?? 1,
  });

  try {
    const documents = await getDocuments(input);
    let inserted = 0;
    let skipped = 0;

    let completed = 0;

    if (input.sourceType === 'all') {
      await db
        .update(contentEmbeddingsTable)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(contentEmbeddingsTable.sourceType, 'media'));
    }

    for (const document of documents) {
      if (!document.isActive) {
        await deactivateSource(document);
        completed += 1;
        continue;
      }

      try {
        const result = await replaceSourceEmbeddings(document);
        inserted += result.inserted;
        skipped += result.skipped;
        completed += 1;
      } catch (error) {
        markEmbeddingSyncFailed(error, {
          documents: documents.length,
          inserted,
          skipped,
          completed,
        });
        throw error;
      }
    }

    const result = {
      documents: documents.length,
      inserted,
      skipped,
      completed,
    };

    markEmbeddingSyncSuccess(result);
    return result;
  } catch (error) {
    markEmbeddingSyncFailed(error);
    throw error;
  }
}

export function scheduleEmbeddingSync(input: SyncSourceInput | { sourceType: 'all' }) {
  void runEmbeddingSyncWithRetry(input);
}

export async function runEmbeddingSyncWithRetry(
  input: SyncSourceInput | { sourceType: 'all' },
  maxAttempts = SYNC_MAX_ATTEMPTS
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await syncContentEmbeddings(input, { attempt, maxAttempts });
    } catch (error) {
      lastError = error;
      console.error(`Embedding sync attempt ${attempt} failed:`, error);

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  markEmbeddingSyncFailed(lastError);
  throw lastError;
}

export async function deactivateContentEmbeddingSource(
  sourceType: SourceType,
  sourceId: number | null,
  sourceSlug?: string | null
) {
  await deactivateSource({ sourceType, sourceId, sourceSlug: sourceSlug ?? null });
}

export async function searchContentEmbeddings(query: string, topK = DEFAULT_TOP_K) {
  const cleanQuery = normalizeText(query).slice(0, 1000);
  const limit = Math.min(Math.max(topK, 1), MAX_TOP_K);

  if (!cleanQuery) {
    return [];
  }

  ensureGatewayEnv();

  let embedding: number[];

  try {
    const result = await embed({
      model: EMBEDDING_MODEL,
      value: cleanQuery,
      maxRetries: EMBEDDING_MAX_RETRIES,
    });
    embedding = result.embedding;
  } catch (error) {
    if (isRateLimitError(error)) {
      console.warn('AI Gateway query embedding rate-limited; using lexical CMS search fallback.');
      return searchContentLexically(cleanQuery, limit);
    }

    throw error;
  }

  const vector = JSON.stringify(embedding);

  try {
    const rows = await db.all<SearchRow>(sql`
      SELECT
        content_embeddings.id,
        content_embeddings.source_type as sourceType,
        content_embeddings.source_id as sourceId,
        content_embeddings.source_slug as sourceSlug,
        content_embeddings.title,
        content_embeddings.content,
        content_embeddings.url,
        content_embeddings.metadata,
        vector_distance_cos(content_embeddings.embedding, vector32(${vector})) as distance
      FROM vector_top_k('content_embeddings_embedding_idx', vector32(${vector}), ${limit * 3}) AS vector_matches
      JOIN content_embeddings ON content_embeddings.rowid = vector_matches.id
      WHERE content_embeddings.is_active = 1
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return rows.map(formatSearchRow);
  } catch (error) {
    console.warn('Vector index search failed; falling back to direct vector scan.', error);

    const rows = await db.all<SearchRow>(sql`
      SELECT
        id,
        source_type as sourceType,
        source_id as sourceId,
        source_slug as sourceSlug,
        title,
        content,
        url,
        metadata,
        vector_distance_cos(embedding, vector32(${vector})) as distance
      FROM content_embeddings
      WHERE is_active = 1
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return rows.map(formatSearchRow);
  }
}

async function searchContentLexically(query: string, limit: number) {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((term) => term.trim())
    .filter((term) => term.length > 2)
    .slice(0, 12);

  const rows = await db
    .select({
      id: contentEmbeddingsTable.id,
      sourceType: contentEmbeddingsTable.sourceType,
      sourceId: contentEmbeddingsTable.sourceId,
      sourceSlug: contentEmbeddingsTable.sourceSlug,
      title: contentEmbeddingsTable.title,
      content: contentEmbeddingsTable.content,
      url: contentEmbeddingsTable.url,
      metadata: contentEmbeddingsTable.metadata,
    })
    .from(contentEmbeddingsTable)
    .where(eq(contentEmbeddingsTable.isActive, true))
    .limit(250);

  return rows
    .map((row) => {
      const title = row.title.toLowerCase();
      const content = row.content.toLowerCase();
      const score = terms.reduce((total, term) => {
        if (title.includes(term)) return total + 3;
        if (content.includes(term)) return total + 1;
        return total;
      }, 0);

      return {
        id: row.id,
        sourceType: row.sourceType as SourceType,
        sourceId: row.sourceId,
        sourceSlug: row.sourceSlug,
        title: row.title,
        content: row.content,
        url: row.url,
        metadata: safeJson(row.metadata),
        score: score / Math.max(terms.length * 3, 1),
      } satisfies RagSearchResult;
    })
    .filter((row) => row.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

function formatSearchRow(row: SearchRow): RagSearchResult {
  return {
    id: row.id,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceSlug: row.sourceSlug,
    title: row.title,
    content: row.content,
    url: row.url,
    metadata: safeJson(row.metadata),
    score: Math.max(0, 1 - Number(row.distance ?? 1)),
  };
}

function safeJson(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
