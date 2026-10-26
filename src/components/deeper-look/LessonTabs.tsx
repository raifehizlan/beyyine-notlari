import { BookOpen, Download, FileText, ScrollText } from 'lucide-react';
import { useEffect, useState } from 'react';

const tabs = [
  { id: 'tefsir', label: 'Tefsir', icon: BookOpen },
  { id: 'notlar', label: 'Notlar', icon: FileText },
  { id: 'transkript', label: 'Transkript', icon: ScrollText },
] as const;

type TabId = (typeof tabs)[number]['id'];

interface LessonTabsProps {
  title: string;
  detail: string;
  showTranscript?: boolean;
}

const downloadLabel: Record<TabId, string> = {
  tefsir: 'Tefsiri indir',
  notlar: 'Notları indir',
  transkript: 'Transkripti indir',
};

function fileSlug(value: string) {
  return value
    .toLocaleLowerCase('tr')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] ?? char;
  });
}

const sheetFonts = `
  @font-face { font-family: DocSerif; src: url('/fonts/merriweather/merriweather-latin-ext-700.woff2') format('woff2'); font-weight: 700; }
  @font-face { font-family: DocSerif; src: url('/fonts/merriweather/merriweather-latin-700.woff2') format('woff2'); font-weight: 700; }
  @font-face { font-family: DocSerif; src: url('/fonts/merriweather/merriweather-latin-ext-400.woff2') format('woff2'); font-weight: 400; }
  @font-face { font-family: DocSerif; src: url('/fonts/merriweather/merriweather-latin-400.woff2') format('woff2'); font-weight: 400; }
  @font-face { font-family: DocSans; src: url('/fonts/inter/inter-latin-ext-600.woff2') format('woff2'); font-weight: 600; }
  @font-face { font-family: DocSans; src: url('/fonts/inter/inter-latin-600.woff2') format('woff2'); font-weight: 600; }
  @font-face { font-family: DocArabic; src: url('/fonts/amiri/amiri-arabic-400.woff2') format('woff2'); font-weight: 400; }
`;

function sheetDocument(body: string, extraCss = '') {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <style>
    ${sheetFonts}
    html, body { margin: 0; padding: 0; background: #FBF9F5; }
    ${extraCss}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function lineBreaks(body: HTMLElement) {
  const rootTop = body.getBoundingClientRect().top;
  const lines: Array<{ top: number; bottom: number }> = [];
  const walker = body.ownerDocument.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent ?? '';
    for (let index = 0; index < text.length; index += 1) {
      if (/\s/.test(text[index] ?? '')) continue;
      const range = body.ownerDocument.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + 1);
      const rect = range.getClientRects()[0];
      if (!rect || rect.height === 0) continue;
      const top = rect.top - rootTop;
      const bottom = rect.bottom - rootTop;
      const center = (top + bottom) / 2;
      const line = lines.find((item) => Math.abs((item.top + item.bottom) / 2 - center) < 20);
      if (line) {
        line.top = Math.min(line.top, top);
        line.bottom = Math.max(line.bottom, bottom);
      } else {
        lines.push({ top, bottom });
      }
    }
    node = walker.nextNode();
  }
  return lines.map((line) => line.bottom + 3);
}

async function renderSheet(html: string, collectBreaks = false) {
  const clip = document.createElement('div');
  const iframe = document.createElement('iframe');
  clip.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('aria-hidden', 'true');
  clip.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;overflow:hidden;pointer-events:none;';
  iframe.style.cssText = 'width:794px;height:400px;border:0;background:#FBF9F5';
  clip.appendChild(iframe);
  document.body.appendChild(clip);
  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      iframe.srcdoc = html;
    });
    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error('PDF sayfası hazırlanamadı');
    const image = doc.querySelector('img');
    if (image instanceof HTMLImageElement && !image.complete) await image.decode().catch(() => undefined);
    await doc.fonts.ready;
    const height = Math.max(1, Math.ceil(doc.body.scrollHeight));
    iframe.style.height = `${height}px`;
    const cssBreaks = collectBreaks ? lineBreaks(doc.body) : [];
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(doc.body, {
      scale: 2,
      backgroundColor: '#FBF9F5',
      width: 794,
      height,
      windowWidth: 794,
      windowHeight: height,
      useCORS: true,
    });
    const scale = canvas.width / 794;
    const breaks = cssBreaks.map((point) => Math.round(point * scale));
    breaks.push(canvas.height);
    return { canvas, breaks };
  } finally {
    clip.remove();
  }
}

function cropCanvas(source: HTMLCanvasElement, y: number, height: number) {
  const slice = document.createElement('canvas');
  slice.width = source.width;
  slice.height = height;
  const context = slice.getContext('2d');
  if (!context) return slice;
  context.fillStyle = '#FBF9F5';
  context.fillRect(0, 0, slice.width, slice.height);
  context.drawImage(source, 0, y, source.width, height, 0, 0, source.width, height);
  return slice;
}

export async function downloadSection(title: string, detail: string, section: string, panelId: string) {
  const panel = document.getElementById(panelId);
  const prose = panel?.querySelector('.lesson-prose');
  if (!prose) return;
  const { canvas: header } = await renderSheet(
    sheetDocument(`
      <div style="box-sizing:border-box;width:794px;background:#0B1A33;color:#E6C98A;padding:10px 32px;display:flex;gap:12px;align-items:center;font-family:DocSans,sans-serif">
        <img src="/logo.jpg" alt="" width="48" height="48" style="width:48px;height:48px;border-radius:8px;display:block" />
        <div>
          <div style="font-size:15px;letter-spacing:1.5px;font-weight:600;line-height:1.2">BEYYİNE NOTLARI</div>
          <div style="margin-top:2px;font-size:11px;line-height:1.2">Kur’an Tefsiri &amp; Müzakere</div>
        </div>
      </div>
      <div style="box-sizing:border-box;width:794px;background:#FBF9F5;padding:10px 32px 8px;border-bottom:2px solid #C6A36A;font-family:DocSerif,Georgia,serif;color:#1c1917">
        <div style="font-family:DocSans,sans-serif;font-size:10px;letter-spacing:1.5px;color:#735728;line-height:1.2">${escapeHtml(section.toLocaleUpperCase('tr'))}</div>
        <div style="margin-top:3px;font-size:20px;line-height:1.25;font-weight:700">${escapeHtml(title)}</div>
        <div style="margin-top:2px;font-family:DocSans,sans-serif;font-size:12px;line-height:1.3;color:#57534e">${escapeHtml(detail)}</div>
      </div>
    `),
  );
  const { canvas: footer } = await renderSheet(
    sheetDocument(`
      <div style="box-sizing:border-box;width:794px;background:#FBF9F5;border-top:2px solid #C6A36A;padding:12px 40px;font-family:DocSans,sans-serif;font-size:12px;color:#735728">
        Beyyine Notları · Kur’an Tefsiri &amp; Müzakere
      </div>
    `),
  );
  const { canvas: body, breaks } = await renderSheet(
    sheetDocument(
      prose.innerHTML,
      `
        body { box-sizing: border-box; width: 794px; padding: 28px 40px 32px; color: #1c1917; font-family: DocSerif, Georgia, serif; font-size: 16px; line-height: 1.75; }
        h2, h3 { font-weight: 700; line-height: 1.35; }
        h2 { margin: 1.1em 0 0.35em; font-size: 22px; }
        h3 { margin: 1em 0 0.3em; font-size: 18px; }
        p { margin: 0.7em 0; }
        ul, ol { margin: 0.7em 0; padding-left: 1.3em; }
        figure { margin: 18px 0; border: 1px solid #E6C98A; background: #FBF7EF; }
        figure > div:first-child { padding: 8px 16px; border-bottom: 1px solid #E6C98A; color: #735728; font-family: DocSans, sans-serif; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; }
        [dir="rtl"] { margin: 14px 16px; font-family: DocArabic, serif; font-size: 28px; line-height: 2.15; text-align: right; }
        figcaption { display: block; padding: 0 16px 16px; }
        a { color: #735728; text-decoration: none; }
      `,
    ),
    true,
  );

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageWidth = 210;
  const pageHeight = 297;
  const headerMm = (header.height / header.width) * pageWidth;
  const footerMm = (footer.height / footer.width) * pageWidth;
  const contentTop = headerMm + 2;
  const contentHeight = pageHeight - contentTop - footerMm - 2;
  const pxPerMm = body.width / pageWidth;
  const slicePx = Math.max(1, Math.floor(contentHeight * pxPerMm));
  const safeBreaks = [...new Set([0, ...breaks, body.height])].sort((a, b) => a - b);
  const slices: Array<[number, number]> = [];
  let start = 0;
  while (start < body.height - 1) {
    const limit = Math.min(body.height, start + slicePx);
    const fitted = safeBreaks.filter((point) => point > start + 8 && point <= limit);
    const end = fitted.length > 0 ? fitted[fitted.length - 1] : limit;
    const next = end > start ? end : limit;
    slices.push([start, next]);
    start = next;
  }
  const pageCount = slices.length;
  const headerImage = header.toDataURL('image/png');
  const footerImage = footer.toDataURL('image/png');

  slices.forEach(([from, to], page) => {
    if (page > 0) pdf.addPage();
    pdf.setFillColor(251, 249, 245);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    pdf.addImage(headerImage, 'PNG', 0, 0, pageWidth, headerMm);
    const slice = cropCanvas(body, from, to - from);
    const sliceMm = slice.height / pxPerMm;
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', 0, contentTop, pageWidth, sliceMm);
    pdf.addImage(footerImage, 'PNG', 0, pageHeight - footerMm, pageWidth, footerMm);
    pdf.setFont('times', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(115, 87, 40);
    pdf.text(`${page + 1} / ${pageCount}`, pageWidth - 12, pageHeight - footerMm / 2 + 1, { align: 'right' });
  });

  pdf.save(`${fileSlug(title)}-${fileSlug(section)}.pdf`);
}

function applyTab(id: TabId) {
  document.querySelectorAll<HTMLElement>('[data-lesson-tab]').forEach((panel) => {
    const active = panel.dataset.lessonTab === id;
    panel.classList.toggle('lesson-panel-active', active);
  });
}

export default function LessonTabs({ title, detail, showTranscript = true }: LessonTabsProps) {
  const available = tabs.filter((tab) => showTranscript || tab.id !== 'transkript');
  const [present, setPresent] = useState<TabId[] | null>(null);
  const shown = available.filter((tab) => (present ? present.includes(tab.id) : true));
  const [active, setActive] = useState<TabId>('tefsir');
  const [preparingPdf, setPreparingPdf] = useState(false);

  useEffect(() => {
    const found = available.map((tab) => tab.id).filter((id) => document.getElementById(`panel-${id}`));
    const ids = found.length > 0 ? found : available.map((tab) => tab.id);
    setPresent(ids);
    const hash = window.location.hash.replace('#', '') as TabId;
    setActive(ids.includes(hash) ? hash : ids[0]);
  }, [showTranscript]);

  useEffect(() => {
    applyTab(active);
  }, [active]);

  function select(id: TabId) {
    setActive(id);
    const nextHash = `#${id}`;
    if (window.location.hash !== nextHash) {
      history.replaceState(null, '', nextHash);
    }
  }

  return (
    <div className="not-prose mb-6 flex items-end gap-3 border-b border-emerald-950/10 dark:border-white/10">
      <div role="tablist" aria-label="Ders bölümleri" className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {shown.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`sekme-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => select(tab.id)}
              className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition ${
                selected
                  ? 'border-amber-700 text-amber-800 dark:border-amber-200 dark:text-amber-200'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => {
          if (preparingPdf) return;
          setPreparingPdf(true);
          void downloadSection(title, detail, downloadLabel[active].replace(' indir', ''), `panel-${active}`).finally(() => setPreparingPdf(false));
        }}
        className="mb-2 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-950/15 px-3 py-2 text-xs font-medium text-stone-800 hover:border-amber-700 disabled:opacity-60 dark:border-white/15 dark:text-amber-100"
        disabled={preparingPdf}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {preparingPdf ? 'PDF hazırlanıyor' : downloadLabel[active]}
      </button>
    </div>
  );
}
