import { defineCollection, z } from 'astro:content';

const audioSchema = z.object({
  spotifyUrl: z.string().url().optional(),
  youtubeUrl: z.string().url().optional(),
  mp3DirectUrl: z.string().url().optional(),
  duration: z.string().optional(),
});

// 1. DEEPER LOOK DERSLERİ ŞEMASI
const deeperLookCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    surahNumber: z.number(),
    surahName: z.string(),
    verseRange: z.string(),
    lessonNumber: z.number(),
    publishDate: z.date(),
    summary: z.string(),
    audio: audioSchema,
    pdfDownloadUrl: z.string().optional(),
    tags: z.array(z.string()).default([]),
    hasNoumanTranscript: z.boolean().default(true),
  }),
});

// 2. ARAPÇA İLİMLERİ ŞEMASI
const arabicCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    category: z.enum(['nahiv', 'sarf', 'belagat', 'kelime-analizi']),
    difficulty: z.enum(['baslangic', 'orta', 'ileri']),
    order: z.number(),
    summary: z.string(),
    publishDate: z.date(),
    relatedFlashcardDeck: z.string().optional(),
    audio: audioSchema.optional(),
    tags: z.array(z.string()).default([]),
  }),
});

// 3. İNTERAKTİF FLASHCARD DESTELERİ ŞEMASI (JSON)
const flashcardsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    deckTitle: z.string(),
    category: z.enum(['kuran-kelimeleri', 'sarf-kaliplari', 'nahiv-terimleri']),
    description: z.string(),
    cards: z.array(
      z.object({
        id: z.string(),
        front: z.object({
          arabic: z.string(),
          transliteration: z.string().optional(),
          hint: z.string().optional(),
        }),
        back: z.object({
          meaning: z.string(),
          root: z.string().optional(),
          grammarType: z.string().optional(),
          quranicExample: z
            .object({
              verseArabic: z.string(),
              surahVerse: z.string(),
              translation: z.string(),
            })
            .optional(),
        }),
      }),
    ),
  }),
});

// 4. KÜTÜPHANE VE KİTAP NOTLARI ŞEMASI
const libraryCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    bookTitle: z.string(),
    author: z.string(),
    category: z.string(),
    publishDate: z.date(),
    readDate: z.date().optional(),
    audio: audioSchema.optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = {
  'deeper-look': deeperLookCollection,
  arabic: arabicCollection,
  flashcards: flashcardsCollection,
  library: libraryCollection,
};
