'use client';

import { CheckCircle2, Loader2, TriangleAlert } from 'lucide-react';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type SaveProgressState = {
  status: 'idle' | 'uploading' | 'saving' | 'success' | 'error';
  progress: number;
  message: string;
};

interface SaveProgressProps {
  state: SaveProgressState;
  className?: string;
}

export const idleSaveProgress: SaveProgressState = {
  status: 'idle',
  progress: 0,
  message: '',
};

export function SaveProgress({ state, className }: SaveProgressProps) {
  if (state.status === 'idle') return null;

  const isError = state.status === 'error';
  const isSuccess = state.status === 'success';

  return (
    <div
      className={cn(
        'w-full rounded-lg border p-3 sm:max-w-sm',
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isSuccess
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-pink-200 bg-pink-50 text-pink-800',
        className,
      )}
      role={isError ? 'alert' : 'status'}
      aria-live="polite"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold sm:text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {isError ? (
            <TriangleAlert className="size-4 shrink-0" />
          ) : isSuccess ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          )}
          <span className="truncate">{state.message}</span>
        </span>
        <span className="shrink-0 tabular-nums">{Math.round(state.progress)}%</span>
      </div>
      <Progress
        value={state.progress}
        className={cn(
          'h-2 bg-white/70',
          isError
            ? '[&_[data-slot=progress-indicator]]:bg-red-600'
            : isSuccess
              ? '[&_[data-slot=progress-indicator]]:bg-green-600'
              : '[&_[data-slot=progress-indicator]]:bg-pink-600',
        )}
      />
    </div>
  );
}
