export type Flashcard = {
  id: string;
  front: {
    arabic: string;
    transliteration?: string;
    hint?: string;
  };
  back: {
    meaning: string;
    root?: string;
    grammarType?: string;
    quranicExample?: {
      verseArabic: string;
      surahVerse: string;
      translation: string;
    };
  };
};

interface FlashcardItemProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onKnow: () => void;
  onAgain: () => void;
}

export default function FlashcardItem({ card, flipped, onFlip, onKnow, onAgain }: FlashcardItemProps) {
  return (
    <div className="flashcard-scene touch-pan-y">
      <div className={`flashcard-inner ${flipped ? 'is-flipped' : ''}`}>
        <div
          role="button"
          tabIndex={0}
          className="flashcard-face flex w-full cursor-pointer flex-col items-center justify-center overflow-auto rounded-3xl border border-emerald-950/10 bg-white px-6 py-8 text-center shadow-lift dark:border-white/10 dark:bg-slate-900"
          onClick={onFlip}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onFlip();
          }}
          aria-label="Kartı çevir"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800 dark:text-amber-200">Ön yüz</p>
          <p dir="rtl" lang="ar" className="mt-6 font-arabic text-5xl leading-relaxed text-slate-900 sm:text-6xl dark:text-amber-50">
            {card.front.arabic}
          </p>
          {card.front.transliteration && (
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">{card.front.transliteration}</p>
          )}
          {card.front.hint && <p className="mt-6 text-sm text-amber-800 dark:text-amber-200">{card.front.hint}</p>}
          <p className="mt-8 text-xs text-slate-400">Çevirmek için karta veya boşluk tuşuna basın</p>
        </div>

        <div
          className="flashcard-face flashcard-back flex cursor-pointer flex-col overflow-auto rounded-3xl border border-amber-300/80 bg-amber-50 px-6 py-6 shadow-lift dark:border-amber-700/40 dark:bg-slate-900"
          onClick={onFlip}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Arka yüz</p>
          <p className="mt-4 font-serif text-3xl text-slate-900 dark:text-slate-50">{card.back.meaning}</p>
          <dl className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-200">
            {card.back.root && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Kök</dt>
                <dd dir="rtl" lang="ar" className="font-arabic text-2xl text-slate-900 dark:text-amber-100">
                  {card.back.root}
                </dd>
              </div>
            )}
            {card.back.grammarType && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Tür</dt>
                <dd>{card.back.grammarType}</dd>
              </div>
            )}
          </dl>
          {card.back.quranicExample && (
            <figure className="mt-4 rounded-2xl border border-amber-300/70 bg-white/70 p-4 dark:border-amber-800 dark:bg-slate-950/40">
              <p dir="rtl" lang="ar" className="font-arabic text-2xl leading-loose text-slate-900 dark:text-amber-50">
                {card.back.quranicExample.verseArabic}
              </p>
              <figcaption className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <span className="font-medium text-amber-800 dark:text-amber-200">{card.back.quranicExample.surahVerse}</span>
                {' · '}
                {card.back.quranicExample.translation}
              </figcaption>
            </figure>
          )}
          <div className="mt-auto grid grid-cols-2 gap-2 pt-4" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={onAgain} className="rounded-2xl bg-rose-700 px-3 py-3 text-sm font-semibold text-white">
              Tekrar et
            </button>
            <button type="button" onClick={onKnow} className="rounded-2xl bg-emerald-700 px-3 py-3 text-sm font-semibold text-white">
              Öğrendim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
