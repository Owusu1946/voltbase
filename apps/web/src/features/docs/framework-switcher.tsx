'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';
import { CodeBlock } from './code-block';

export const EXAMPLE_FRAMEWORKS = [
  { id: 'nextjs', label: 'Next.js' },
  { id: 'react', label: 'React' },
  { id: 'vue', label: 'Vue' },
  { id: 'nuxt', label: 'Nuxt' },
  { id: 'sveltekit', label: 'SvelteKit' },
  { id: 'astro', label: 'Astro' },
  { id: 'expo', label: 'Expo' },
  { id: 'hono', label: 'Hono' },
] as const;

export type ExampleFrameworkId = (typeof EXAMPLE_FRAMEWORKS)[number]['id'];

const STORAGE_KEY = 'voltbase.docs.framework';
const DEFAULT_FRAMEWORK: ExampleFrameworkId = 'nextjs';

type FrameworkContextValue = {
  framework: ExampleFrameworkId;
  setFramework: (id: ExampleFrameworkId) => void;
};

const FrameworkContext = createContext<FrameworkContextValue | null>(null);

function isFrameworkId(value: string): value is ExampleFrameworkId {
  return EXAMPLE_FRAMEWORKS.some((f) => f.id === value);
}

export function FrameworkProvider({ children }: { children: ReactNode }) {
  const [framework, setFrameworkState] =
    useState<ExampleFrameworkId>(DEFAULT_FRAMEWORK);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isFrameworkId(saved)) setFrameworkState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  function setFramework(id: ExampleFrameworkId) {
    setFrameworkState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }

  return (
    <FrameworkContext.Provider value={{ framework, setFramework }}>
      {children}
    </FrameworkContext.Provider>
  );
}

export function useExampleFramework() {
  const ctx = useContext(FrameworkContext);
  if (!ctx) {
    throw new Error('useExampleFramework must be used within FrameworkProvider');
  }
  return ctx;
}

export function FrameworkTabs({ className }: { className?: string }) {
  const { framework, setFramework } = useExampleFramework();

  return (
    <div
      className={cn(
        'my-6 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1',
        className,
      )}
      role="tablist"
      aria-label="Framework"
    >
      {EXAMPLE_FRAMEWORKS.map((fw) => {
        const active = framework === fw.id;
        return (
          <button
            key={fw.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFramework(fw.id)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-[13px] font-medium transition',
              active
                ? 'bg-[#1c1c1c] text-white'
                : 'bg-transparent text-[#5c5c5c] hover:bg-[#f0f0f0] hover:text-[#1c1c1c]',
            )}
          >
            {fw.label}
          </button>
        );
      })}
    </div>
  );
}

export type FrameworkSnippet = {
  code: string;
  language?: string;
  filename?: string;
};

export function FrameworkCode({
  snippets,
  className,
}: {
  snippets: Partial<Record<ExampleFrameworkId, FrameworkSnippet>> & {
    nextjs: FrameworkSnippet;
  };
  className?: string;
}) {
  const { framework } = useExampleFramework();
  const snippet = snippets[framework] ?? snippets.nextjs;

  return (
    <CodeBlock
      className={className}
      code={snippet.code}
      language={snippet.language ?? 'ts'}
      filename={snippet.filename}
    />
  );
}
