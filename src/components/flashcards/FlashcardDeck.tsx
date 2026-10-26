import { type TouchEvent, useEffect, useRef, useState } from 'react';
import FlashcardItem, { type Flashcard } from './FlashcardItem';

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export default function FlashcardDeck({ cards }: FlashcardDeckProps) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [cursor, setCursor] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [again, setAgain] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const current = cards[order[cursor] ?? 0];

  function resetFlip() {
    setFlipped(false);
  }

  function go(delta: number) {
    setCursor((value) => Math.min(Math.max(value + delta, 0), Math.max(order.length - 1, 0)));
    resetFlip();
  }

  function know() {
    if (!current) return;
    const nextKnown = known.includes(current.id) ? known : [...known, current.id];
    setKnown(nextKnown);
    setAgain((ids) => ids.filter((id) => id !== current.id));
    resetFlip();
    if (nextKnown.length === cards.length) {
      setDone(true);
      return;
    }
    setCursor((value) => (value < order.length - 1 ? value + 1 : 0));
  }

  function repeatCard() {
    if (!current) return;
    setAgain((ids) => (ids.includes(current.id) ? ids : [...ids, current.id]));
    setKnown((ids) => ids.filter((id) => id !== current.id));
    resetFlip();
    setOrder((previous) => {
      if (cursor >= previous.length - 1) return previous;
      const next = [...previous];
      const [moved] = next.splice(cursor, 1);
      if (moved === undefined) return previous;
      next.push(moved);
      return next;
    });
    if (cursor >= order.length - 1) setCursor(0);
  }

  function restart() {
    setOrder(cards.map((_, index) => index));
    setCursor(0);
    setFlipped(false);
    setKnown([]);
    setAgain([]);
    setDone(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (document.querySelector('[role="dialog"]')) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return;
        if (target.closest('a')) return;
        if (target.closest('button') && event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      }
      if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        if (!done) setFlipped((value) => !value);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!done) go(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (!done) go(-1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touchStart.current || done) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    swiped.current = true;
    if (dx < 0) go(1);
    else go(-1);
  }

  if (!current) {
    return <p className="rounded-2xl border border-dashed border-emerald-950/15 p-6 text-sm text-slate-500">Bu destede kart yok.</p>;
  }

  const learned = known.length;
  const progress = cards.length ? Math.round((learned / cards.length) * 100) : 0;

  return (
    <section aria-label={done ? 'Tamamlanan deste' : 'Flashcard çalışma alanı'} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
          <p aria-live="polite">
            {done ? cards.length : cursor + 1} / {cards.length} Kart
          </p>
          <p>
            Öğrenilen {learned} · Tekrar {again.length} · Kalan {cards.length - learned}
          </p>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-emerald-950/10 dark:bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={cards.length}
          aria-valuenow={learned}
          aria-label="Öğrenilen kartlar"
        >
          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {done ? (
        <div className="rounded-3xl border border-emerald-700/20 bg-emerald-700/5 px-6 py-12 text-center">
          <p className="font-serif text-3xl text-stone-950 dark:text-amber-50">Desteyi tamamladın</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            {cards.length} kartın tamamı öğrenildi olarak işaretlendi. İstersen desteyi baştan çalışabilirsin.
          </p>
          <button type="button" onClick={restart} className="mt-6 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white">
            Baştan çalış
          </button>
        </div>
      ) : (
        <FlashcardItem
          key={current.id}
          card={current}
          flipped={flipped}
          onFlip={() => {
            if (swiped.current) {
              swiped.current = false;
              return;
            }
            setFlipped((value) => !value);
          }}
          onKnow={know}
          onAgain={repeatCard}
        />
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={done || cursor === 0}
          className="rounded-full border border-emerald-950/10 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/10"
        >
          Önceki
        </button>
        <p className="text-center text-xs text-slate-500">Boşluk çevirir · Sol ve sağ ok gezinir · Yatay kaydırma da kart değiştirir</p>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={done || cursor >= order.length - 1}
          className="rounded-full border border-emerald-950/10 px-4 py-2 text-sm disabled:opacity-40 dark:border-white/10"
        >
          Sonraki
        </button>
      </div>
    </section>
  );
}
