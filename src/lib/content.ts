import type { CollectionEntry } from 'astro:content';

export const arabicCategoryLabels = {
  nahiv: 'Nahiv',
  sarf: 'Sarf',
  belagat: 'Belâgat',
  'kelime-analizi': 'Kelime Analizi',
} as const;

export const arabicCategoryDescriptions = {
  nahiv: 'Cümle, irab ve öğelerin görevi.',
  sarf: 'Kök, bâb ve çekim kalıpları.',
  belagat: 'Meânî, beyân ve bedî‘.',
  'kelime-analizi': 'Ayet içindeki kelimenin sarf ve nahiv çözümlemesi.',
} as const;

export const lessonGroupSize = 20;

export const arabicCategoryOrder = ['nahiv', 'sarf', 'belagat', 'kelime-analizi'] as const;

export const difficultyLabels = {
  baslangic: 'Başlangıç',
  orta: 'Orta',
  ileri: 'İleri',
} as const;

export const flashcardCategoryLabels = {
  'kuran-kelimeleri': 'Kur’an Kelimeleri',
  'sarf-kaliplari': 'Sarf Kalıpları',
  'nahiv-terimleri': 'Nahiv Terimleri',
} as const;

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function lessonParts(entry: CollectionEntry<'deeper-look'>) {
  const [surah, ...rest] = entry.slug.split('/');
  return { surah, slug: rest.join('/') };
}

export function lessonHref(entry: CollectionEntry<'deeper-look'>) {
  const { surah, slug } = lessonParts(entry);
  return `/deeper-look/${surah}/${slug}`;
}

export function surahHref(surahNumber: number) {
  return `/deeper-look/sure/${surahNumber}`;
}

export function verseSpan(ranges: string[]) {
  let min = Infinity;
  let max = -Infinity;
  for (const range of ranges) {
    const numbers = range
      .split(/[-–]/)
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value));
    if (numbers.length === 0) continue;
    min = Math.min(min, numbers[0]);
    max = Math.max(max, numbers[numbers.length - 1]);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '';
  return min === max ? String(min) : `${min}–${max}`;
}

export function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function sortLessons(entries: CollectionEntry<'deeper-look'>[]) {
  return [...entries].sort((a, b) => {
    if (a.data.lessonNumber !== b.data.lessonNumber) {
      return a.data.lessonNumber - b.data.lessonNumber;
    }
    return a.data.publishDate.getTime() - b.data.publishDate.getTime();
  });
}

export function sortBySurah(entries: CollectionEntry<'deeper-look'>[]) {
  return [...entries].sort((a, b) => {
    if (a.data.surahNumber !== b.data.surahNumber) return a.data.surahNumber - b.data.surahNumber;
    return a.data.lessonNumber - b.data.lessonNumber;
  });
}

export function seriesNeighbors(
  entries: CollectionEntry<'deeper-look'>[],
  current: CollectionEntry<'deeper-look'>,
) {
  const surah = lessonParts(current).surah;
  const series = sortLessons(entries.filter((entry) => lessonParts(entry).surah === surah));
  const index = series.findIndex((entry) => entry.id === current.id);
  return {
    previous: series[index - 1],
    next: series[index + 1],
  };
}

export function parseVerseRange(range: string) {
  const match = range.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (!match) return [range];
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [range];
  const verses: string[] = [];
  const last = Math.min(end, start + 39);
  for (let verse = start; verse <= last; verse += 1) verses.push(String(verse));
  return verses;
}

export function arabicHref(entry: CollectionEntry<'arabic'>) {
  const [category, ...rest] = entry.slug.split('/');
  return `/arapca/${category}/${rest.join('/')}`;
}

export function sortArabic(entries: CollectionEntry<'arabic'>[]) {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

export function withPodcastMeta(
  label: string,
  audio?: { spotifyUrl?: string; youtubeUrl?: string; mp3DirectUrl?: string },
) {
  if (!audio?.spotifyUrl && !audio?.youtubeUrl && !audio?.mp3DirectUrl) return label;
  return `${label} · Podcast`;
}

export function tagHref(tag: string) {
  return `/deeper-look?etiket=${encodeURIComponent(tag)}`;
}

export function bookSlug(value: string) {
  const slug = value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'kitap';
}

export interface LibraryBook {
  slug: string;
  bookTitle: string;
  author: string;
  category: string;
  notes: CollectionEntry<'library'>[];
}

export function groupLibrary(notes: CollectionEntry<'library'>[]) {
  const byBook = new Map<string, CollectionEntry<'library'>[]>();
  for (const note of notes) {
    const key = `${note.data.bookTitle}\0${note.data.author}`;
    const list = byBook.get(key) ?? [];
    list.push(note);
    byBook.set(key, list);
  }

  const used = new Set<string>();
  const books: LibraryBook[] = [];
  for (const list of byBook.values()) {
    list.sort((a, b) => a.data.publishDate.getTime() - b.data.publishDate.getTime());
    const { bookTitle, author, category } = list[0].data;
    let slug = bookSlug(bookTitle);
    if (used.has(slug)) slug = `${slug}-${bookSlug(author)}`;
    let extra = 2;
    while (used.has(slug)) {
      slug = `${bookSlug(bookTitle)}-${extra}`;
      extra += 1;
    }
    used.add(slug);
    books.push({ slug, bookTitle, author, category, notes: list });
  }

  return books.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle, 'tr'));
}

export function bookHref(slug: string) {
  return `/kutuphane/eser/${slug}`;
}
