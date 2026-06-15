'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface SlugComboboxOption {
  value: string;
  label: string;
  description?: string;
}

interface SlugComboboxProps {
  value?: string;
  options: SlugComboboxOption[];
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  className?: string;
}

function highlightMatch(text: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const matchIndex = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());
  if (matchIndex === -1) return text;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + trimmedQuery.length);
  const after = text.slice(matchIndex + trimmedQuery.length);

  return (
    <>
      {before}
      <mark className="rounded bg-pink-200 px-0.5 text-slate-950">{match}</mark>
      {after}
    </>
  );
}

export function SlugCombobox({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
}: SlugComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'h-auto min-h-10 w-full justify-between gap-3 border-pink-200 bg-white px-3 py-2 text-left text-slate-950 hover:bg-pink-50',
            className,
          )}
        >
          <span className="min-w-0 flex-1">
            {selectedOption ? (
              <span className="flex min-w-0 flex-col items-start">
                <span className="w-full truncate text-sm font-semibold text-slate-950">
                  {selectedOption.label}
                </span>
                {selectedOption.description && (
                  <code className="w-full truncate text-xs text-pink-700">
                    {selectedOption.description}
                  </code>
                )}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{placeholder}</span>
            )}
          </span>
          <ChevronDown className="size-4 shrink-0 text-pink-700 transition-transform data-[open=true]:rotate-180" data-open={open} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            className="text-slate-950"
          />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-sm text-slate-700">
              {emptyMessage}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option, index) => (
                <CommandItem
                  key={`${option.value}-${index}`}
                  value={`${option.label} ${option.description ?? ''} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className="cursor-pointer text-slate-950 data-[selected=true]:bg-pink-50"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.16, delay: Math.min(index * 0.015, 0.12) }}
                    className="flex w-full min-w-0 items-center gap-2"
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0 text-pink-700',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-950">
                        {highlightMatch(option.label, query)}
                      </span>
                      {option.description && (
                        <code className="block truncate text-xs text-pink-700">
                          {highlightMatch(option.description, query)}
                        </code>
                      )}
                    </span>
                  </motion.div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
