import { Download, FileText, NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { downloadSection } from '../deeper-look/LessonTabs';

export interface ReadingTab {
  id: 'ders' | 'notlar';
  label: string;
  download: string;
}

interface ReadingTabsProps {
  title: string;
  detail: string;
  tabs: ReadingTab[];
}

function applyTab(id: string) {
  document.querySelectorAll<HTMLElement>('[data-lesson-tab]').forEach((panel) => {
    panel.classList.toggle('lesson-panel-active', panel.dataset.lessonTab === id);
  });
}

export default function ReadingTabs({ title, detail, tabs }: ReadingTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? 'notlar');
  const [preparingPdf, setPreparingPdf] = useState(false);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  useEffect(() => {
    applyTab(active);
  }, [active]);

  if (!current) return null;

  return (
    <div className="not-prose mb-6 mt-8 flex items-end gap-3 border-b border-emerald-950/10 dark:border-white/10">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Yazı bölümleri" className="-mb-px flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const selected = tab.id === active;
            const Icon = tab.id === 'notlar' ? NotebookPen : FileText;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(tab.id)}
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
      )}
      <button
        type="button"
        disabled={preparingPdf}
        onClick={() => {
          if (preparingPdf) return;
          setPreparingPdf(true);
          void downloadSection(title, detail, current.label, `panel-${current.id}`).finally(() => setPreparingPdf(false));
        }}
        className="mb-2 ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-950/15 px-3 py-2 text-xs font-medium text-stone-800 hover:border-amber-700 disabled:opacity-60 dark:border-white/15 dark:text-amber-100"
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        {preparingPdf ? 'PDF hazırlanıyor' : current.download}
      </button>
    </div>
  );
}
