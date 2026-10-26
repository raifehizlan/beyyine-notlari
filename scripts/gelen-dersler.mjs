import { readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mammoth from 'mammoth';
import TurndownService from 'turndown';

const root = fileURLToPath(new URL('..', import.meta.url));
const gelenDir = path.join(root, 'gelen', 'tefsir');
const contentDir = path.join(root, 'src', 'content', 'deeper-look');

const surahs = [
  ['fatiha', 'Fâtiha'],
  ['bakara', 'Bakara'],
  ['ali-imran', 'Âl-i İmrân'],
  ['nisa', 'Nisâ'],
  ['maide', 'Mâide'],
  ['enam', "En'âm"],
  ['araf', "A'râf"],
  ['enfal', 'Enfâl'],
  ['tevbe', 'Tevbe'],
  ['yunus', 'Yûnus'],
  ['hud', 'Hûd'],
  ['yusuf', 'Yûsuf'],
  ['rad', "Ra'd"],
  ['ibrahim', 'İbrâhîm'],
  ['hicr', 'Hicr'],
  ['nahl', 'Nahl'],
  ['isra', 'İsrâ'],
  ['kehf', 'Kehf'],
  ['meryem', 'Meryem'],
  ['taha', 'Tâhâ'],
  ['enbiya', 'Enbiyâ'],
  ['hac', 'Hac'],
  ['muminun', "Mü'minûn"],
  ['nur', 'Nûr'],
  ['furkan', 'Furkân'],
  ['suara', 'Şuarâ'],
  ['neml', 'Neml'],
  ['kasas', 'Kasas'],
  ['ankebut', 'Ankebût'],
  ['rum', 'Rûm'],
  ['lokman', 'Lokmân'],
  ['secde', 'Secde'],
  ['ahzab', 'Ahzâb'],
  ['sebe', "Sebe'"],
  ['fatir', 'Fâtır'],
  ['yasin', 'Yâsîn'],
  ['saffat', 'Sâffât'],
  ['sad', 'Sâd'],
  ['zumer', 'Zümer'],
  ['mumin', "Mü'min"],
  ['fussilet', 'Fussilet'],
  ['sura', 'Şûrâ'],
  ['zuhruf', 'Zuhruf'],
  ['duhan', 'Duhân'],
  ['casiye', 'Câsiye'],
  ['ahkaf', 'Ahkâf'],
  ['muhammed', 'Muhammed'],
  ['fetih', 'Fetih'],
  ['hucurat', 'Hucurât'],
  ['kaf', 'Kâf'],
  ['zariyat', 'Zâriyât'],
  ['tur', 'Tûr'],
  ['necm', 'Necm'],
  ['kamer', 'Kamer'],
  ['rahman', 'Rahmân'],
  ['vakia', 'Vâkıa'],
  ['hadid', 'Hadîd'],
  ['mucadele', 'Mücâdele'],
  ['hasr', 'Haşr'],
  ['mumtehine', 'Mümtehine'],
  ['saf', 'Saf'],
  ['cuma', "Cum'a"],
  ['munafikun', 'Münâfikûn'],
  ['tegabun', 'Tegâbün'],
  ['talak', 'Talâk'],
  ['tahrim', 'Tahrîm'],
  ['mulk', 'Mülk'],
  ['kalem', 'Kalem'],
  ['hakka', 'Hâkka'],
  ['mearic', 'Meâric'],
  ['nuh', 'Nûh'],
  ['cin', 'Cin'],
  ['muzzemmil', 'Müzzemmil'],
  ['muddessir', 'Müddessir'],
  ['kiyamet', 'Kıyâmet'],
  ['insan', 'İnsân'],
  ['murselat', 'Mürselât'],
  ['nebe', "Nebe'"],
  ['naziat', 'Nâziât'],
  ['abese', 'Abese'],
  ['tekvir', 'Tekvîr'],
  ['infitar', 'İnfitâr'],
  ['mutaffifin', 'Mutaffifîn'],
  ['insikak', 'İnşikâk'],
  ['buruc', 'Burûc'],
  ['tarik', 'Târık'],
  ['ala', "A'lâ"],
  ['gasiye', 'Gâşiye'],
  ['fecr', 'Fecr'],
  ['beled', 'Beled'],
  ['sems', 'Şems'],
  ['leyl', 'Leyl'],
  ['duha', 'Duhâ'],
  ['insirah', 'İnşirâh'],
  ['tin', 'Tîn'],
  ['alak', 'Alak'],
  ['kader', 'Kadir'],
  ['beyyine', 'Beyyine'],
  ['zilzal', 'Zilzâl'],
  ['adiyat', 'Âdiyât'],
  ['karia', 'Kâria'],
  ['tekasur', 'Tekâsür'],
  ['asr', 'Asr'],
  ['humeze', 'Hümeze'],
  ['fil', 'Fîl'],
  ['kureys', 'Kureyş'],
  ['maun', 'Mâûn'],
  ['kevser', 'Kevser'],
  ['kafirun', 'Kâfirûn'],
  ['nasr', 'Nasr'],
  ['tebbet', 'Tebbet'],
  ['ihlas', 'İhlâs'],
  ['felak', 'Felak'],
  ['nas', 'Nâs'],
];

if (surahs.length !== 114) throw new Error(`Sûre listesi 114 olmalı, şu an ${surahs.length}.`);

const surahBySlug = new Map(surahs.map(([slug, name], index) => [slug, { number: index + 1, name, slug }]));

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

function plainKey(value) {
  return value
    .toLocaleLowerCase('tr')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function yaml(value) {
  return JSON.stringify(value);
}

function localDay(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function escapeMdx(markdown) {
  return markdown.replaceAll('{', '&#123;').replaceAll('}', '&#125;').replaceAll('<', '&lt;');
}

function sectionKind(line) {
  const match = line.match(/^#{1,3}\s+(.+?)\s*$/);
  if (!match) return null;
  const name = plainKey(match[1]);
  if (name === 'tefsir') return 'tefsir';
  if (name === 'notlar' || name === 'calisma notu' || name === 'calisma notlari') return 'notlar';
  if (name === 'transkript') return 'transkript';
  return null;
}

function splitSections(markdown, fallback) {
  const sections = { tefsir: '', notlar: '', transkript: '' };
  let current = fallback;
  const chunks = { tefsir: [], notlar: [], transkript: [] };
  let seenMarker = false;
  for (const line of markdown.split(/\r?\n/)) {
    const kind = sectionKind(line);
    if (kind) {
      seenMarker = true;
      current = kind;
      continue;
    }
    chunks[current].push(line);
  }
  if (!seenMarker) {
    sections[fallback] = markdown.trim();
    return sections;
  }
  for (const key of Object.keys(sections)) sections[key] = chunks[key].join('\n').trim();
  return sections;
}

function readHeader(markdown) {
  const lines = markdown.split(/\r?\n/);
  const fields = {};
  let index = 0;
  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      if (Object.keys(fields).length > 0) {
        index += 1;
        break;
      }
      continue;
    }
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) break;
    const key = plainKey(match[1].trim());
    const value = match[2].trim();
    if (['baslik', 'title'].includes(key)) fields.title = value;
    else if (['ozet', 'summary'].includes(key)) fields.summary = value;
    else if (key === 'youtube') fields.youtubeUrl = value;
    else if (key === 'spotify') fields.spotifyUrl = value;
    else if (key === 'mp3') fields.mp3DirectUrl = value;
    else if (['sure', 'duration'].includes(key)) fields.duration = value;
    else if (['etiket', 'etiketler', 'tags'].includes(key)) fields.tags = value.split(',').map((tag) => tag.trim()).filter(Boolean);
    else break;
  }
  return { fields, body: lines.slice(index).join('\n').trim() };
}

function firstHeading(markdown) {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() ?? '';
}

function summaryFrom(markdown, title) {
  const paragraph = markdown
    .split(/\n\s*\n/)
    .map((block) => block.replace(/^#+\s+/gm, '').replace(/\s+/g, ' ').trim())
    .find((block) => block && block !== title);
  if (!paragraph) return title;
  return paragraph.length > 180 ? `${paragraph.slice(0, 177)}...` : paragraph;
}

function parseFilename(fileName) {
  const base = fileName.replace(/\.(md|markdown|docx)$/i, '');
  const suffix = base.match(/-(tefsir|notlar|transkript)$/i);
  const section = suffix ? suffix[1].toLocaleLowerCase('tr') : 'tefsir';
  const stem = suffix ? base.slice(0, -suffix[0].length) : base;
  const parts = stem.split('-').filter(Boolean);
  if (parts.length < 3 || !/^\d+$/.test(parts[0])) return null;
  const lessonNumber = Number(parts[0]);
  let verseEnd = null;
  let verseStart = null;
  if (/^\d+$/.test(parts.at(-1) ?? '')) verseEnd = Number(parts.pop());
  if (/^\d+$/.test(parts.at(-1) ?? '') && parts.length > 1) verseStart = Number(parts.pop());
  else verseStart = verseEnd;
  const slug = parts.slice(1).join('-').toLocaleLowerCase('tr');
  const surah = surahBySlug.get(slug);
  if (!surah || !verseStart) return null;
  const verseRange = verseEnd && verseEnd !== verseStart ? `${verseStart}-${verseEnd}` : String(verseStart);
  return { lessonNumber, section, surah, verseRange, verseStart, verseEnd: verseEnd ?? verseStart };
}

async function toMarkdown(filePath) {
  if (filePath.toLowerCase().endsWith('.docx')) {
    const result = await mammoth.convertToHtml({ path: filePath });
    return turndown.turndown(result.value).trim();
  }
  return (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '').trim();
}

function stripMatchingH1(markdown, title) {
  const match = markdown.match(/^#\s+(.+)\n+/);
  if (match && match[1].trim() === title) return markdown.slice(match[0].length).trim();
  return markdown;
}

function lessonMarkdown(lesson) {
  const audio = [];
  if (lesson.youtubeUrl) audio.push(`  youtubeUrl: ${lesson.youtubeUrl}`);
  if (lesson.spotifyUrl) audio.push(`  spotifyUrl: ${lesson.spotifyUrl}`);
  if (lesson.mp3DirectUrl) audio.push(`  mp3DirectUrl: ${lesson.mp3DirectUrl}`);
  if (lesson.duration) audio.push(`  duration: ${yaml(lesson.duration)}`);
  const tags = (lesson.tags ?? []).map((tag) => `  - ${yaml(tag)}`).join('\n');
  const panels = ['tefsir', 'notlar', 'transkript']
    .filter((tab) => lesson.sections[tab])
    .map((tab) => {
      const body = stripMatchingH1(lesson.sections[tab], lesson.title);
      return `<LessonPanel tab="${tab}">\n\n${escapeMdx(body)}\n\n</LessonPanel>`;
    })
    .join('\n\n');

  return `---
title: ${yaml(lesson.title)}
surahNumber: ${lesson.surah.number}
surahName: ${yaml(lesson.surah.name)}
verseRange: ${yaml(lesson.verseRange)}
lessonNumber: ${lesson.lessonNumber}
publishDate: ${lesson.publishDate}
summary: ${yaml(lesson.summary)}
audio: ${audio.length ? `\n${audio.join('\n')}` : '{}'}
tags: ${tags ? `\n${tags}` : '[]'}
hasNoumanTranscript: ${Boolean(lesson.sections.transkript)}
gelen: true
---

import LessonPanel from '../../../components/deeper-look/LessonPanel.astro';

${panels}
`;
}

async function walkMdx(dir) {
  const found = [];
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walkMdx(full)));
    else if (entry.name.endsWith('.mdx')) found.push(full);
  }
  return found;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function importGelen() {
  await readdir(gelenDir).catch(() => []);
  const names = (await readdir(gelenDir).catch(() => [])).filter((name) => /\.(md|markdown|docx)$/i.test(name) && !name.startsWith('~$'));
  const groups = new Map();
  const errors = [];

  for (const name of names) {
    const parsed = parseFilename(name);
    const errorPath = path.join(gelenDir, `${name}.hata.txt`);
    if (!parsed) {
      const message = `${name}: ad şu biçimde olmalı: 011-bakara-28-30.md veya 011-bakara-28-30-notlar.docx`;
      errors.push(message);
      await writeFile(errorPath, `${message}\n`);
      continue;
    }
    await unlink(errorPath).catch(() => {});
    const filePath = path.join(gelenDir, name);
    const info = await stat(filePath);
    const raw = await toMarkdown(filePath);
    const { fields, body } = readHeader(raw);
    const sections = splitSections(body, parsed.section);
    const key = `${parsed.surah.slug}-${parsed.lessonNumber}`;
    const group = groups.get(key) ?? {
      ...parsed,
      title: '',
      summary: '',
      youtubeUrl: '',
      spotifyUrl: '',
      mp3DirectUrl: '',
      duration: '',
      tags: [],
      mtime: info.mtime,
      sections: { tefsir: '', notlar: '', transkript: '' },
    };
    for (const tab of ['tefsir', 'notlar', 'transkript']) {
      if (sections[tab]) group.sections[tab] = sections[tab];
    }
    if (fields.title && (!group.title || parsed.section === 'tefsir')) group.title = fields.title;
    if (fields.summary && (!group.summary || parsed.section === 'tefsir')) group.summary = fields.summary;
    for (const urlKey of ['youtubeUrl', 'spotifyUrl', 'mp3DirectUrl']) {
      if (!fields[urlKey]) continue;
      if (!validUrl(fields[urlKey])) {
        errors.push(`${name}: ${urlKey} geçerli bir adres değil.`);
        continue;
      }
      group[urlKey] = fields[urlKey];
    }
    if (fields.duration) group.duration = fields.duration;
    if (fields.tags?.length) group.tags = fields.tags;
    if (info.mtime < group.mtime) group.mtime = info.mtime;
    groups.set(key, group);
  }

  const writtenKeys = new Set();
  for (const [key, group] of groups) {
    if (!group.sections.tefsir && !group.sections.notlar && !group.sections.transkript) {
      errors.push(`${key}: dosyanın içinde metin yok.`);
      continue;
    }
    const prose = group.sections.tefsir || group.sections.notlar;
    group.publishDate = localDay(group.mtime);
    group.title = group.title || firstHeading(prose) || `${group.surah.name} ${group.lessonNumber}`;
    group.summary = group.summary || summaryFrom(prose, group.title);
    const folder = `${String(group.surah.number).padStart(3, '0')}-${group.surah.slug}`;
    const file = `${String(group.lessonNumber).padStart(3, '0')}-${group.surah.slug}-${group.verseRange}.mdx`;
    const destination = path.join(contentDir, folder, file);
    const next = lessonMarkdown(group);
    const previous = await readFile(destination, 'utf8').catch(() => '');
    if (previous && !previous.includes('gelen: true')) {
      errors.push(`${file} zaten elle yazılmış. Üzerine yazılmadı.`);
      continue;
    }
    if (previous !== next) {
      await writeFile(destination, next);
      console.log(`Ders hazır: ${folder}/${file}`);
    }
    writtenKeys.add(key);
  }

  if (errors.length === 0) {
    for (const filePath of await walkMdx(contentDir)) {
      const text = await readFile(filePath, 'utf8');
      if (!text.includes('gelen: true')) continue;
      const match = text.match(/^surahName: .+\nverseRange: .+\nlessonNumber: (\d+)/m);
      const folder = path.basename(path.dirname(filePath));
      const slug = folder.replace(/^\d+-/, '');
      const lessonNumber = match?.[1];
      if (lessonNumber && writtenKeys.has(`${slug}-${Number(lessonNumber)}`)) continue;
      await unlink(filePath);
      console.log(`Ders kalktı: ${path.relative(contentDir, filePath)}`);
    }
  } else {
    for (const message of errors) console.error(message);
  }
}

export function gelenDersler() {
  return {
    name: 'gelen-dersler',
    hooks: {
      'astro:config:setup': async () => {
        await importGelen();
      },
      'astro:server:setup': ({ server }) => {
        server.watcher.add(gelenDir);
        let timer;
        const refresh = (file) => {
          if (!file.split(path.sep).includes('gelen')) return;
          clearTimeout(timer);
          timer = setTimeout(() => {
            importGelen().catch((error) => console.error(error));
          }, 200);
        };
        server.watcher.on('add', refresh);
        server.watcher.on('change', refresh);
        server.watcher.on('unlink', refresh);
      },
    },
  };
}

const isDirect = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirect) {
  importGelen().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
