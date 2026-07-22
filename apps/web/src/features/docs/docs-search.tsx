'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Hash, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchDocs,
  type DocsSearchHit,
} from './docs-search-index';

function useDocsSearch(query: string) {
  return useMemo(() => searchDocs(query), [query]);
}

function HitIcon({ hit }: { hit: DocsSearchHit }) {
  if (hit.kind === 'section') {
    return <Hash size={14} className="shrink-0 text-[#8c8c8c]" />;
  }
  return <FileText size={14} className="shrink-0 text-[#8c8c8c]" />;
}

function SearchResultsList({
  results,
  activeIndex,
  listId,
  onSelect,
  onHover,
}: {
  results: DocsSearchHit[];
  activeIndex: number;
  listId: string;
  onSelect: (hit: DocsSearchHit) => void;
  onHover: (index: number) => void;
}) {
  if (results.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-[#8c8c8c]">
        No results
      </p>
    );
  }

  return (
    <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
      {results.map((hit, index) => {
        const active = index === activeIndex;
        return (
          <li key={hit.id} role="option" aria-selected={active}>
            <button
              type="button"
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(hit)}
              className={cn(
                'flex w-full items-start gap-2.5 px-3 py-2 text-left transition',
                active ? 'bg-[#eef8f2]' : 'hover:bg-[#f5f5f5]',
              )}
            >
              <HitIcon hit={hit} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#1c1c1c]">
                  {hit.kind === 'section' ? hit.sectionTitle : hit.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#8c8c8c]">
                  {hit.kind === 'section'
                    ? `${hit.group} · ${hit.title}`
                    : hit.group}
                  {hit.kind === 'page' && hit.description
                    ? ` — ${hit.description}`
                    : null}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function DocsSearchBox({
  onNavigate,
  autoFocus,
  className,
}: {
  onNavigate?: () => void;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useDocsSearch(query);
  const showResults = open && query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const selectHit = useCallback(
    (hit: DocsSearchHit) => {
      setQuery('');
      setOpen(false);
      onNavigate?.();
      router.push(hit.href);
    },
    [onNavigate, router],
  );

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showResults) {
      if (e.key === 'Escape') {
        setQuery('');
        inputRef.current?.blur();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[activeIndex];
      if (hit) selectHit(hit);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        size={14}
        className="pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 text-[#8c8c8c]"
      />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Allow click on results before closing
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        placeholder="Search docs…"
        aria-autocomplete="list"
        aria-controls={showResults ? listId : undefined}
        aria-expanded={showResults}
        role="combobox"
        className="w-full rounded-md border border-[#e6e6e6] bg-white py-2 pr-3 pl-8 text-sm text-[#1c1c1c] outline-none placeholder:text-[#8c8c8c] focus:border-[#3ecf8e] focus:ring-2 focus:ring-[#3ecf8e]/25"
      />
      {showResults ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 overflow-hidden rounded-lg border border-[#e6e6e6] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <SearchResultsList
            results={results}
            activeIndex={activeIndex}
            listId={listId}
            onSelect={selectHit}
            onHover={setActiveIndex}
          />
        </div>
      ) : null}
    </div>
  );
}

export function DocsSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useDocsSearch(query);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectHit = useCallback(
    (hit: DocsSearchHit) => {
      onOpenChange(false);
      router.push(hit.href);
    },
    [onOpenChange, router],
  );

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[activeIndex];
      if (hit) selectHit(hit);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-[#1c1c1c]/35 backdrop-blur-[2px]"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative mx-auto mt-[12vh] w-[min(560px,calc(100%-2rem))] overflow-hidden rounded-xl border border-[#e6e6e6] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-2 border-b border-[#ececec] px-3">
          <Search size={16} className="shrink-0 text-[#8c8c8c]" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search documentation…"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded
            role="combobox"
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-[#1c1c1c] outline-none placeholder:text-[#8c8c8c]"
          />
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1.5 text-[#8c8c8c] transition hover:bg-[#f5f5f5] hover:text-[#1c1c1c]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {query.trim() ? (
          <SearchResultsList
            results={results}
            activeIndex={activeIndex}
            listId={listId}
            onSelect={selectHit}
            onHover={setActiveIndex}
          />
        ) : (
          <div className="px-3 py-6 text-center text-sm text-[#8c8c8c]">
            Search pages and section headings. Try “RLS”, “Next.js”, or
            “realtime”.
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-[#ececec] px-3 py-2 text-[11px] text-[#8c8c8c]">
          <span>
            <kbd className="rounded border border-[#e6e6e6] bg-[#fafafa] px-1">↑↓</kbd>{' '}
            navigate
          </span>
          <span>
            <kbd className="rounded border border-[#e6e6e6] bg-[#fafafa] px-1">↵</kbd>{' '}
            open
          </span>
          <span>
            <kbd className="rounded border border-[#e6e6e6] bg-[#fafafa] px-1">esc</kbd>{' '}
            close
          </span>
        </div>
      </div>
    </div>
  );
}

export function DocsSearchTrigger({
  onOpen,
  className,
}: {
  onOpen: () => void;
  className?: string;
}) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-md border border-[#e6e6e6] bg-white px-3 text-sm text-[#8c8c8c] transition hover:border-[#d4d4d4] hover:text-[#5c5c5c]',
        className,
      )}
    >
      <Search size={14} />
      <span className="hidden sm:inline">Search docs…</span>
      <kbd className="ml-1 hidden rounded border border-[#e6e6e6] bg-[#fafafa] px-1.5 py-0.5 font-mono text-[10px] text-[#8c8c8c] md:inline">
        {isMac ? '⌘K' : 'Ctrl K'}
      </kbd>
    </button>
  );
}
