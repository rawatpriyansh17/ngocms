export type EmbeddingSyncState = 'idle' | 'syncing' | 'success' | 'failed';

export type EmbeddingSyncStatus = {
  state: EmbeddingSyncState;
  sourceType?: string;
  sourceId?: number;
  sourceSlug?: string;
  attempts: number;
  maxAttempts: number;
  lastStartedAt?: string;
  lastFinishedAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  documents?: number;
  inserted?: number;
  skipped?: number;
  completed?: number;
};

const initialStatus: EmbeddingSyncStatus = {
  state: 'idle',
  attempts: 0,
  maxAttempts: 3,
};

let status: EmbeddingSyncStatus = initialStatus;

function getReadableSyncError(error: unknown) {
  const statusCode =
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : undefined;

  const lastError =
    typeof error === 'object' && error !== null && 'lastError' in error
      ? error.lastError
      : undefined;

  const lastStatusCode =
    typeof lastError === 'object' &&
    lastError !== null &&
    'statusCode' in lastError &&
    typeof lastError.statusCode === 'number'
      ? lastError.statusCode
      : undefined;

  if (statusCode === 429 || lastStatusCode === 429) {
    return 'AI Gateway rate limit reached. Please wait and try again.';
  }

  if (statusCode === 402 || lastStatusCode === 402) {
    return 'AI Gateway budget limit reached.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Embedding sync failed.';
}

export function getEmbeddingSyncStatus() {
  return status;
}

export function markEmbeddingSyncStarted(input: {
  sourceType: string;
  sourceId?: number;
  sourceSlug?: string;
  attempt: number;
  maxAttempts: number;
}) {
  status = {
    state: 'syncing',
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceSlug: input.sourceSlug,
    attempts: input.attempt,
    maxAttempts: input.maxAttempts,
    lastStartedAt: new Date().toISOString(),
    lastSuccessAt: status.lastSuccessAt,
    documents: status.documents,
    inserted: status.inserted,
    skipped: status.skipped,
  };
}

export function markEmbeddingSyncSuccess(result: {
  documents: number;
  inserted: number;
  skipped: number;
  completed?: number;
}) {
  const finishedAt = new Date().toISOString();

  status = {
    ...status,
    state: 'success',
    lastFinishedAt: finishedAt,
    lastSuccessAt: finishedAt,
    lastError: undefined,
    documents: result.documents,
    inserted: result.inserted,
    skipped: result.skipped,
    completed: result.completed ?? result.documents,
  };
}

export function markEmbeddingSyncFailed(
  error: unknown,
  progress?: {
    documents: number;
    inserted: number;
    skipped: number;
    completed: number;
  }
) {
  status = {
    ...status,
    state: 'failed',
    lastFinishedAt: new Date().toISOString(),
    lastError: getReadableSyncError(error),
    documents: progress?.documents ?? status.documents,
    inserted: progress?.inserted ?? status.inserted,
    skipped: progress?.skipped ?? status.skipped,
    completed: progress?.completed ?? status.completed,
  };
}
