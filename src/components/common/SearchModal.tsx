import { Search, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

type PagefindResult = {
  url: string;
  excerpt: string;
  meta?: Record<string, string | string[]>;
  filters?: Record<string, string[]>;
};

type PagefindModule = {
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<PagefindResult> }> }>;
  init?: () => Promise<void>;
  options?: (options: Record<string, unknown>) => Promise<void>;
};

const badgeClasses: Record<string, string> = {
  Tefsir: 'bg-emerald-700/10 text-emerald-800 dark:text-emerald-200',
  Transkript: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
  Nahiv: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Sarf: 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  'Belâgat': 'bg-amber-500/15 text-amber-800 dark:text-amber-200',
  Flashcard: 'bg-emerald-950/10 text-emerald-900 dark:text-emerald-100',
  Kütüphane: 'bg-slate-500/10 text-slate-700 dark:text-slate-200',
};

function safeExcerpt(value: string) {
  return value.replace(/<(?!\/?mark\b)[^>]*>/gi, '');
}

function readField(value: string | string[] | undefined, fallback: string) {
  if (Array.isArray(value)) return value[0] || fallback;
  if (typeof value === 'string' && value.trim()) return value;
  return fallback;
}

function readMeta(result: PagefindResult) {
  return readField(result.meta?.kategori ?? result.filters?.kategori, 'Sayfa');
}

function readTitle(result: PagefindResult) {
  return readField(result.meta?.title, result.url);
}

async function loadPagefind() {
  // Vite, public altındaki dosyayı kaynak koddan import etmeye izin vermez.
  // Yolu çalışma anında kurup tarayıcının doğrudan modülü yüklemesini sağlıyoruz.
  const runtimeImport = new Function(
    'specifier',
    'return import(specifier)',
  ) as (specifier: string) => Promise<PagefindModule & { default?: PagefindModule }>;
  const loaded = await runtimeImport('/pagefind/pagefind.js');
  const pagefind = loaded.search ? loaded : loaded.default;
  if (!pagefind?.search) throw new Error('Pagefind arama modülü bulunamadı.');
  await pagefind.options?.({ basePath: '/pagefind/', excerptLength: 28 });
  return pagefind;
}

export default function SearchModal() {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PagefindResult[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'empty'>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const pagefindRef = useRef<PagefindModule | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('beyyine:open-search', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beyyine:open-search', onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setStatus('loading');
      try {
        if (!pagefindRef.current) pagefindRef.current = await loadPagefind();
        const search = await pagefindRef.current.search(term);
        const next = await Promise.all(search.results.slice(0, 8).map((result) => result.data()));
        for (const result of next) result.excerpt = result.excerpt ?? '';
        if (cancelled) return;
        setResults(next);
        setActiveIndex(0);
        setStatus(next.length ? 'ready' : 'empty');
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setResults([]);
          setStatus('missing');
        }
      }
    }, 140);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, query]);

  if (!open) return null;

  function close() {
    setOpen(false);
  }

  function onQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      window.location.assign(results[activeIndex].url);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/55 px-4 pt-[12vh] backdrop-blur-sm">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Aramayı kapat" onClick={close} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-3xl border border-emerald-950/10 bg-paper shadow-lift dark:border-white/10 dark:bg-night"
      >
        <h2 id={titleId} className="sr-only">
          Sitede ara
        </h2>
        <div className="flex items-center gap-3 border-b border-emerald-950/10 px-4 dark:border-white/10">
          <Search className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onQueryKeyDown}
            placeholder="Kök, ayet veya kavram ara"
            className="h-14 w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            aria-label="Arama"
            aria-controls="arama-sonuclari"
            aria-activedescendant={results[activeIndex] ? `arama-sonuc-${activeIndex}` : undefined}
          />
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-emerald-700/10"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {status === 'idle' && (
            <p className="px-3 py-6 text-sm text-slate-500">En az iki karakter yazın. Örnek: hamd ile şükür, mürebbî, fâil.</p>
          )}
          {status === 'loading' && <p className="px-3 py-6 text-sm text-slate-500">Aranıyor…</p>}
          {status === 'empty' && <p className="px-3 py-6 text-sm text-slate-500">Bu ifade için sonuç yok.</p>}
          {status === 'missing' && (
            <p className="px-3 py-6 text-sm leading-6 text-slate-500">
              Arama dizini henüz yok. `npm run build` komutu Pagefind dizinini üretir; ardından `npm run preview` ile deneyin.
            </p>
          )}
          {status === 'ready' && (
            <ul id="arama-sonuclari" role="listbox" aria-label="Arama sonuçları" className="space-y-1">
              {results.map((result, index) => {
                const category = readMeta(result);
                const selected = index === activeIndex;
                return (
                  <li key={`${result.url}-${index}`} role="presentation">
                    <a
                      id={`arama-sonuc-${index}`}
                      role="option"
                      aria-selected={selected}
                      href={result.url}
                      className={`block rounded-2xl px-3 py-3 ${selected ? 'bg-emerald-700/10' : 'hover:bg-emerald-700/5'}`}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${badgeClasses[category] ?? 'bg-slate-500/10 text-slate-600'}`}
                      >
                        {category}
                      </span>
                      <span className="mt-2 block font-medium text-slate-900 dark:text-slate-100">{readTitle(result)}</span>
                      <span
                        className="mt-2 block text-sm leading-6 text-slate-700 dark:text-slate-200 [&_mark]:bg-amber-200/80 [&_mark]:text-slate-900"
                        dangerouslySetInnerHTML={{ __html: safeExcerpt(result.excerpt) }}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
