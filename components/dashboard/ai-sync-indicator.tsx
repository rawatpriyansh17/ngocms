'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Brain,
  CheckCircle2,
  Clock,
  Clock2,
  InfoIcon,
  Loader2,
  RefreshCcw,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

type SyncState = 'idle' | 'syncing' | 'success' | 'failed';

type SyncStatus = {
  state: SyncState;
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

const fallbackStatus: SyncStatus = {
  state: 'idle',
  attempts: 0,
  maxAttempts: 3,
};

function formatTime(value?: string) {
  if (!value) return 'Not yet';

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getStatusCopy(status: SyncStatus) {
  const hasPartialProgress =
    status.state === 'failed' && (status.completed ?? 0) > 0;

  if (status.state === 'syncing') {
    return {
      label: 'Updating AI Brain',
      detail: 'Learning from recent CMS changes...',
      helper: `Attempt ${status.attempts} of ${status.maxAttempts}`,
      icon: Loader2,
      iconClass: 'bg-pink-600 text-white',
      dotClass: 'bg-pink-300',
      panelClass: 'from-pink-700 via-pink-600 to-fuchsia-600',
    };
  }

  if (status.state === 'failed') {
    return {
      label: hasPartialProgress ? 'AI Brain Paused' : 'AI Brain is Paused',
      detail: hasPartialProgress
        ? `Saved progress for ${status.completed} of ${status.documents ?? status.completed} items.`
        : 'Could not learn the latest changes!',
      helper: status.lastError ?? 'Try again after a short wait.',
      icon: TriangleAlert,
      iconClass: 'bg-red-50 text-red-700',
      dotClass: 'bg-red-500',
      panelClass: 'from-red-700 via-rose-600 to-pink-600',
    };
  }

  if (status.state === 'success') {
    const learned = status.inserted ?? 0;

    return {
      label: 'AI Brain Synced',
      detail: learned > 0
        ? `Learned ${learned} new update${learned === 1 ? '' : 's'}.`
        : `No new updates`,
      helper: learned > 0
        ? 'New content was successfully learned.'
        : 'Everything was already up to date.',
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-700',
      dotClass: 'bg-emerald-500',
      panelClass: 'from-emerald-700 via-green-600 to-green-700',
    };
  }

  return {
    label: 'AI Brain is Ready',
    detail: 'Waiting for the any updates...',
    helper: 'Save a post, event, or media item to teach the assistant.',
    icon: Brain,
    iconClass: 'bg-pink-50 text-pink-700',
    dotClass: 'bg-slate-400',
    panelClass: 'from-pink-800 via-pink-700 to-pink-500',
  };
}

function getSourceLabel(status: SyncStatus) {
  if (status.sourceType === 'all') return 'Full website content';
  if (status.sourceSlug) return status.sourceSlug;
  if (status.sourceType) return status.sourceType.replaceAll('_', ' ');
  return '';
}

function getStatusStyle(state: SyncState) {
  if (state === 'success') {
    return {
      borderClass: 'border-emerald-600',
      accentTextClass: 'text-emerald-600',
      accentBgClass: 'bg-emerald-500',
      accentGradientClass: 'from-emerald-500 to-teal-600',
    };
  }

  if (state === 'failed') {
    return {
      borderClass: 'border-red-600',
      accentTextClass: 'text-red-600',
      accentBgClass: 'bg-red-500',
      accentGradientClass: 'from-red-500 to-rose-600',
    };
  }

  if (state === 'syncing') {
    return {
      borderClass: 'border-fuchsia-600',
      accentTextClass: 'text-fuchsia-600',
      accentBgClass: 'bg-fuchsia-500',
      accentGradientClass: 'from-pink-500 to-fuchsia-600',
    };
  }

  return {
    borderClass: 'border-pink-600',
    accentTextClass: 'text-pink-500',
    accentBgClass: 'bg-pink-500',
    accentGradientClass: 'from-pink-500 to-pink-600',
  };
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getLearningSummary(status: SyncStatus) {
  const learned = status.inserted ?? 0;
  const known = status.skipped ?? 0;
  const total = status.documents ?? 0;
  const completed = status.completed ?? (status.state === 'success' ? total : 0);

  if (status.state === 'syncing') {
    return {
      title: 'Learning is in progress',
      body: 'The assistant is checking your latest CMS changes now.',
      meta: 'This may pause if the AI Gateway rate limit is reached.',
    };
  }

  if (status.state === 'failed') {
    return {
      title: completed > 0 ? 'Some learning was saved' : 'Learning paused',
      body:
        completed > 0
          ? `${pluralize(completed, 'item')} finished before the pause. You can retry later without starting over.`
          : 'The assistant could not start learning this update yet.',
      meta:
        learned > 0
          ? `${pluralize(learned, 'new update')} learned. ${pluralize(known, 'item')} already understood.`
          : known > 0
            ? `${pluralize(known, 'item')} already understood.`
            : 'No new knowledge was saved in this attempt.',
    };
  }

  if (total > 0 && learned === 0) {
    return {
      title: 'Already up to date',
      body: 'The assistant already knew the latest saved content.',
      meta: `${pluralize(known, 'item')} checked and already understood.`,
    };
  }

  if (learned > 0) {
    return {
      title: 'New content learned',
      body: `The assistant learned ${pluralize(learned, 'new update')} from your latest edit.`,
      meta: known > 0 ? `${pluralize(known, 'older item')} already understood.` : undefined,
    };
  }

  return {
    title: 'Ready to learn',
    body: 'Save a post, event, or latest event to update the knowledge of assistant.',
    meta: undefined,
  };
}

export function AiSyncIndicator() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SyncStatus>(fallbackStatus);
  const [isRetrying, setIsRetrying] = useState(false);
  const [hiddenError, setHiddenError] = useState<string | undefined>();
  const copy = useMemo(() => getStatusCopy(status), [status]);
  const learningSummary = useMemo(() => getLearningSummary(status), [status]);
  const statusStyle = useMemo(() => getStatusStyle(status.state), [status.state]);
  const Icon = copy.icon;
  const progressValue =
    status.state === 'syncing'
      ? Math.max(22, Math.min(88, (status.attempts / Math.max(status.maxAttempts, 1)) * 100))
      : status.state === 'success'
        ? 100
        : status.state === 'failed'
          ? (status.documents ?? 0) > 0
            ? Math.max(8, Math.min(100, ((status.completed ?? 0) / (status.documents ?? 1)) * 100))
            : 100
          : 0;

  async function refreshStatus(signal?: AbortSignal) {
    const response = await fetch('/api/dashboard/ai-sync/status', {
      cache: 'no-store',
      signal,
    });

    if (response.ok) {
      const nextStatus = (await response.json()) as SyncStatus;
      setStatus(nextStatus);
      if (nextStatus.state !== 'failed') {
        setHiddenError(undefined);
      }
    }
  }

  async function retrySync() {
    setIsRetrying(true);

    try {
      const response = await fetch('/api/dashboard/ai-sync/retry', {
        method: 'POST',
      });

      if (response.ok) {
        const nextStatus = (await response.json()) as SyncStatus;
        setStatus(nextStatus);
        if (nextStatus.state !== 'failed') {
          setHiddenError(undefined);
        }
      }

      window.setTimeout(() => {
        void refreshStatus();
        setIsRetrying(false);
      }, 600);
    } catch {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const initialRefresh = window.setTimeout(() => {
      void refreshStatus(controller.signal);
    }, 0);

    const interval = window.setInterval(() => {
      void refreshStatus(controller.signal);
    }, status.state === 'syncing' ? 2500 : 7000);

    return () => {
      controller.abort();
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [status.state]);

  return (
    <Popover open={open} onOpenChange={setOpen} >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex min-w-0 items-center overflow-hidden rounded-full border border-pink-200 bg-white px-2 py-1.5 shadow-sm transition-[width,max-width,min-width,padding,box-shadow,border-color,background-color] duration-300 ease-out cursor-pointer',
            'border-b-2 border-r-2',
            statusStyle.borderClass,
            open ? 'sm:w-12 sm:min-w-0 sm:max-w-12 sm:px-2' : 'sm:w-56 sm:min-w-56 sm:max-w-56 sm:px-3'
          )}
          aria-label={copy.label}
        >
          <span
            className={cn(
              'relative grid size-7 shrink-0 place-items-center rounded-full transition-colors',
              copy.iconClass
            )}
          >
            <Icon
              className={cn(
                'size-4',
                status.state === 'syncing' && 'animate-spin'
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white',
                copy.dotClass,
                status.state === 'syncing' && 'animate-pulse'
              )}
            />
          </span>
          <span
            className={cn(
              'hidden min-w-0 flex-1 overflow-hidden text-left transition-[opacity,max-width,transform] duration-200 sm:block',
              open
                ? 'pointer-events-none max-w-0 -translate-x-1 opacity-0'
                : 'max-w-44 translate-x-0 opacity-100'
            )}
          >
            <span className={cn('ml-2 block truncate font-mono text-[11px] font-extrabold ',statusStyle.accentTextClass)}>
              {copy.label}
            </span>
            <span className={cn('ml-2 block max-w-44 truncate whitespace-nowrap font-mono text-[8px] font-bold leading-tight ', statusStyle.accentTextClass)}>
              {copy.detail}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className={cn(
          'w-[min(23rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-b-4 border-r-4 p-0 shadow-2xl sm:w-[min(24rem,calc(100vw-1.5rem))] sm:rounded-3xl',
          statusStyle.borderClass
        )}
      >
        <div className={cn('bg-gradient-to-br p-3 text-white sm:p-4', copy.panelClass)}>
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/15 shadow-inner ring-1 ring-white/20 sm:size-11 sm:rounded-xl">
              <Icon
                className={cn(
                  'size-4 sm:size-5',
                  status.state === 'syncing' && 'animate-spin'
                )}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <p className="truncate font-mono text-lg font-extrabold leading-tight sm:text-2xl">
                {copy.label}
              </p>
              <p className="mt-1 line-clamp-2 font-mono text-[10px] font-bold leading-snug text-pink-50 sm:text-xs">
                {copy.detail}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3  bg-gradient-to-b from-white to-pink-50/70 p-3 sm:space-y-4 sm:p-4">
          <div className={cn("rounded-xl border border-b-2 border-r-2  bg-white p-2.5 shadow-sm sm:p-3", statusStyle.borderClass)}>
            <div className="mb-2.5 flex flex-col gap-1.5 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex size-3 shrink-0">
                  <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', statusStyle.accentBgClass)} />
                  <span className={cn('relative inline-flex size-3 rounded-full bg-gradient-to-b', statusStyle.accentGradientClass)} />
                </span>
                <p className={cn('whitespace-nowrap font-mono text-[10px] font-extrabold tracking-[0.12em] sm:text-xs sm:tracking-[0.14em]', statusStyle.accentTextClass)}>
                  Latest change 
                </p>
              </div>
              <p className="min-w-0 truncate font-mono text-xs font-extrabold uppercase text-pink-950 sm:max-w-44 sm:text-right sm:text-sm">
                  {getSourceLabel(status)}
              </p>
            </div>
            <Progress
              value={progressValue}
              className={cn(
                'h-2.5 bg-pink-100 [&_[data-slot=progress-indicator]]:bg-gradient-to-r',
                status.state === 'failed'
                  ? '[&_[data-slot=progress-indicator]]:from-red-500 [&_[data-slot=progress-indicator]]:to-rose-600'
                  : status.state === 'success'
                    ? '[&_[data-slot=progress-indicator]]:from-emerald-500 [&_[data-slot=progress-indicator]]:to-teal-600'
                    : status.state === 'syncing'
                      ? '[&_[data-slot=progress-indicator]]:from-pink-500 [&_[data-slot=progress-indicator]]:to-fuchsia-600'
                      : '[&_[data-slot=progress-indicator]]:from-pink-500 [&_[data-slot=progress-indicator]]:to-pink-600'
              )}
            />
            <p className={cn("mt-2 font-mono text-[10px] font-semibold leading-relaxed text-pink-700 sm:text-[11px]", statusStyle.accentTextClass)}>
              {copy.helper}
            </p>
          </div>

          {(status.documents ?? 0) > 0 && (
            <div className="rounded-xl border border-pink-700 border-b-2 border-r-2 bg-white/95 p-3 shadow-sm">
              <p className="font-mono text-xs font-extrabold text-pink-700 flex items-center gap-2">
               <InfoIcon className="size-4 text-pink-500" aria-hidden="true" /> {learningSummary.title}
              </p>
              <p className="mt-1 font-mono text-[10px] font-bold leading-relaxed text-pink-600 sm:text-[11px]">
               Summary: {learningSummary.body}
              </p>
              {learningSummary.meta && (
                <p className="mt-1 rounded-md bg-gradient-to-br from-pink-600 to-pink-700 p-2 font-mono text-[10px] font-bold leading-relaxed text-white sm:text-[11px]">
                🌟 Updates: {learningSummary.meta}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2 rounded-xl border border-b-2 border-r-2 border-blue-600 bg-white p-2.5 font-mono text-[10px] font-bold  shadow-sm sm:p-3 sm:text-[11px] text-blue-800">
            <div className="flex items-center justify-between gap-3">
              <span className=" flex items-center gap-2"><Clock className="size-4" aria-hidden="true" /> Last checked</span>
              <span className="text-right font-extrabold text-blue-950">
                {formatTime(status.lastFinishedAt)}
              </span>
            </div>
            <Separator/>
            <div className="flex items-center justify-between gap-3">
              <span className=" flex items-center gap-2"><Clock2 className="size-4" aria-hidden="true" /> Last successful sync</span>
              <span className="text-right font-extrabold text-blue-950">
                {formatTime(status.lastSuccessAt)}
              </span>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {status.state === 'failed' && status.lastError && hiddenError !== status.lastError && (
              <motion.div
                key={status.lastError}
                initial={{ opacity: 0, y: -8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.99 }}
                transition={{
                  type: 'spring',
                  stiffness: 700,
                  damping: 38,
                  mass: 0.45,
                }}
                className="-mt-1 overflow-hidden rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 p-0.5 shadow-lg shadow-rose-900/15"
              >
                <div className="flex items-start gap-2.5 rounded-[calc(theme(borderRadius.2xl)-2px)] bg-white/10 p-2.5 text-white ring-1 ring-white/15 sm:gap-3 sm:p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/20 sm:size-8">
                    <TriangleAlert className="size-3.5 sm:size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] font-extrabold sm:text-xs">
                      AI brain paused
                    </p>
                    <p className="mt-1 font-mono text-[10px] font-bold leading-relaxed text-red-50 sm:text-[11px]">
                      {status.lastError ?? 'Some content was saved, but the assistant could not finish learning yet.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="grid size-6 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/20 hover:text-white sm:size-7"
                    aria-label="Dismiss sync error"
                    onClick={() => setHiddenError(status.lastError)}
                  >
                    <X className="size-3.5 sm:size-4" aria-hidden="true" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(status.state === 'failed' || isRetrying) && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                disabled={isRetrying}
                className="flex-1 cursor-pointer bg-gradient-to-b from-purple-600 to-purple-700 font-mono font-extrabold text-white shadow-md shadow-purple-900/15 hover:from-purple-700 hover:to-purple-800"
                onClick={() => void retrySync()}
              >
                {isRetrying ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCcw className="size-4" aria-hidden="true" />
                )}
                Try Again
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
