'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { Check, Copy } from 'lucide-react';
import { highlight } from 'sugar-high';
import { css, go } from 'sugar-high/presets';
import { cn } from '@/lib/utils';

const FILENAME_BY_LANG: Record<string, string> = {
  ts: 'index.ts',
  tsx: 'component.tsx',
  js: 'index.js',
  jsx: 'component.jsx',
  bash: 'terminal',
  shell: 'terminal',
  sh: 'terminal',
  sql: 'query.sql',
  json: 'data.json',
  text: 'plain.txt',
  css: 'theme.css',
  go: 'main.go',
};

/** Soft light theme — set as inline vars so sugar-high token colors always resolve. */
const SUGAR_HIGH_THEME = {
  '--sh-class': '#6a9ad2',
  '--sh-identifier': '#354150',
  '--sh-sign': '#8996a3',
  '--sh-property': '#354150',
  '--sh-entity': '#249a97',
  '--sh-jsxliterals': '#6266d1',
  '--sh-string': '#00a99a',
  '--sh-keyword': '#f47067',
  '--sh-comment': '#a19595',
  '--sh-space': 'transparent',
} as CSSProperties;

function highlightCode(code: string, language: string) {
  const lang = language.toLowerCase();
  if (lang === 'css') return highlight(code, { ...css });
  if (lang === 'go') return highlight(code, { ...go });
  return highlight(code);
}

export function CodeBlock({
  code,
  language = 'ts',
  filename,
  className,
}: {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const trimmed = code.replace(/^\n/, '').replace(/\n$/, '');
  const title =
    filename ?? FILENAME_BY_LANG[language.toLowerCase()] ?? language;
  const html = useMemo(
    () => highlightCode(trimmed, language),
    [trimmed, language],
  );

  async function copy() {
    await navigator.clipboard.writeText(trimmed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      style={SUGAR_HIGH_THEME}
      className={cn(
        'docs-code group relative my-5 overflow-hidden rounded-xl border border-[#e8e8e8] bg-[#fafafa] shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <div className="relative flex h-10 items-center border-b border-[#ececec] bg-[#f3f3f3] px-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#d0d0d0]" />
          <span className="size-2.5 rounded-full bg-[#d0d0d0]" />
          <span className="size-2.5 rounded-full bg-[#d0d0d0]" />
        </div>
        <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[12px] text-[#6b7280]">
          {title}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="relative z-10 ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] text-[#8b919a] transition hover:bg-black/5 hover:text-[#374151]"
          aria-label={copied ? 'Copied' : 'Copy code'}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#fcfcfc] p-4 text-[13px] leading-[1.7] text-[#354150]">
        <code
          className="font-mono [&_.sh__line]:block"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
