import { Check, Download, Link2, Pause, Play, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface StickyAudioPlayerProps {
  title: string;
  subtitle: string;
  duration?: string;
  mp3DirectUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  pdfDownloadUrl?: string;
  pdfTitle?: string;
}

const YT_ENDED = 0;
const YT_PLAYING = 1;

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: Record<string, unknown>) => YouTubePlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApi: Promise<void> | undefined;

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve();
  if (!youtubeApi) {
    youtubeApi = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        previous?.();
        resolve();
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
  }
  return youtubeApi;
}

function youtubeId(url?: string) {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0];
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const watch = parsed.searchParams.get('v');
      if (watch) return watch;
      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live');
      if (marker >= 0) return parts[marker + 1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function StickyAudioPlayer({
  title,
  subtitle,
  duration,
  mp3DirectUrl,
  spotifyUrl,
  youtubeUrl,
  pdfDownloadUrl,
  pdfTitle,
}: StickyAudioPlayerProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const youtubeHostRef = useRef<HTMLDivElement>(null);
  const youtubeRef = useRef<YouTubePlayer | null>(null);
  const playWhenReady = useRef(false);
  const videoId = youtubeId(youtubeUrl);
  const canPlay = Boolean(mp3DirectUrl || videoId);
  const [stuck, setStuck] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    const measure = () => setBarHeight(bar.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bar);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 80);
      },
      { threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!videoId || mp3DirectUrl) return undefined;
    const host = youtubeHostRef.current;
    if (!host) return undefined;
    let cancelled = false;
    void loadYouTubeApi().then(() => {
      if (cancelled || !youtubeHostRef.current || !window.YT) return;
      const player = new window.YT.Player(youtubeHostRef.current, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            const length = event.target.getDuration();
            if (length) setMediaDuration(length);
            if (playWhenReady.current) {
              playWhenReady.current = false;
              event.target.playVideo();
            }
          },
          onStateChange: (event: { data: number }) => {
            setPlaying(event.data === YT_PLAYING);
            if (event.data === YT_ENDED) {
              setPlaying(false);
              setProgress(1000);
            }
          },
        },
      });
      youtubeRef.current = player;
    });
    return () => {
      cancelled = true;
      youtubeRef.current?.destroy();
      youtubeRef.current = null;
    };
  }, [videoId, mp3DirectUrl]);

  useEffect(() => {
    if (!playing || mp3DirectUrl) return undefined;
    const timer = window.setInterval(() => {
      const player = youtubeRef.current;
      if (!player?.getCurrentTime) return;
      const current = player.getCurrentTime();
      const length = player.getDuration();
      if (!Number.isFinite(current)) return;
      setElapsed(current);
      if (length) {
        setMediaDuration(length);
        setProgress((current / length) * 1000);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [playing, mp3DirectUrl]);

  async function togglePlayback() {
    if (mp3DirectUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) {
        await audio.play();
        setPlaying(true);
        return;
      }
      audio.pause();
      setPlaying(false);
      return;
    }
    const player = youtubeRef.current;
    if (!player?.playVideo) {
      playWhenReady.current = true;
      return;
    }
    if (player.getPlayerState() === YT_PLAYING) player.pauseVideo();
    else player.playVideo();
  }

  function onSeek(value: number) {
    if (mp3DirectUrl) {
      const audio = audioRef.current;
      if (!audio || !Number.isFinite(audio.duration) || audio.duration === 0) return;
      audio.currentTime = (value / 1000) * audio.duration;
      setProgress(value);
      setElapsed(audio.currentTime);
      return;
    }
    const player = youtubeRef.current;
    const length = player?.getDuration?.() ?? 0;
    if (!player || !length) return;
    player.seekTo((value / 1000) * length, true);
    setProgress(value);
    setElapsed((value / 1000) * length);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => {
    if (!shareOpen) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (!shareRef.current?.contains(event.target as Node)) setShareOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShareOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [shareOpen]);

  function shareOnWhatsApp() {
    const url = window.location.href;
    const href = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
    setShareOpen(false);
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  const timeLabel = mediaDuration
    ? `${formatClock(elapsed)} / ${formatClock(mediaDuration)}`
    : duration || 'Süre yok';

  return (
    <div className="relative my-6">
      {videoId && !mp3DirectUrl && (
        <div className="pointer-events-none fixed top-0 -left-[120vw] h-40 w-72" aria-hidden="true">
          <div ref={youtubeHostRef} className="h-full w-full" />
        </div>
      )}
      <div ref={anchorRef} style={stuck ? { height: barHeight } : undefined}>
      <div
        ref={barRef}
        className={stuck ? 'fixed inset-x-0 bottom-0 z-30 px-3 pb-3' : 'relative'}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-emerald-950/10 bg-paper/95 px-4 py-3 shadow-lift backdrop-blur dark:border-white/10 dark:bg-night/95 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={togglePlayback}
            disabled={!canPlay}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            aria-label={playing ? 'Duraklat' : 'Oynat'}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{title}</p>
            <p className="truncate text-xs text-slate-500">{subtitle}</p>
            <label className="mt-2 block">
              <span className="sr-only">Ses konumu</span>
              <input
                type="range"
                min={0}
                max={1000}
                value={progress}
                disabled={!canPlay}
                onChange={(event) => onSeek(Number(event.target.value))}
                className="w-full accent-emerald-700 disabled:opacity-40"
              />
            </label>
          </div>
          <p className="shrink-0 text-xs tabular-nums text-slate-500">{timeLabel}</p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-emerald-950/10 px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-700 dark:border-white/10 dark:text-slate-200"
              >
                Spotify
              </a>
            )}
            {pdfDownloadUrl && (
              <a
                href={pdfDownloadUrl}
                download
                title={pdfTitle ?? 'Bu dersin çalışma notu'}
                aria-label={pdfTitle ? `${pdfTitle} PDF dosyasını indir` : 'Ders notunu indir'}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-950/10 px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-700 dark:border-white/10 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Ders notunu indir
              </a>
            )}
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-950/10 px-3 py-2 text-xs font-medium text-slate-700 hover:border-emerald-700 dark:border-white/10 dark:text-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? 'Kopyalandı' : 'Bağlantı'}
            </button>
            <div className="relative" ref={shareRef}>
              <button
                type="button"
                aria-expanded={shareOpen}
                aria-haspopup="menu"
                onClick={() => setShareOpen((open) => !open)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-700 px-3 py-2 text-xs font-medium text-white"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                Paylaş
              </button>
              {shareOpen && (
                <div
                  role="menu"
                  className={`absolute right-0 z-20 min-w-36 rounded-2xl border border-emerald-950/10 bg-paper p-1 shadow-lift dark:border-white/10 dark:bg-night ${stuck ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={shareOnWhatsApp}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-800 hover:bg-emerald-700/10 dark:text-slate-100"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#128C7E]" aria-hidden="true" fill="currentColor">
                      <path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.41a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2zm5.76 14.15c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.41-.14-.95-.32-1.64-.63-2.89-1.25-4.77-4.16-4.91-4.35-.14-.19-1.17-1.55-1.17-2.96s.74-2.1 1-2.39c.26-.28.57-.35.76-.35h.55c.17 0 .41-.07.64.49.24.58.82 2 .89 2.15.07.14.12.32.02.51-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.56.16.28.72 1.19 1.55 1.93 1.07.95 1.96 1.25 2.24 1.39.28.14.44.12.6-.07.17-.19.7-.81.89-1.09.19-.28.38-.23.64-.14.26.09 1.65.78 1.93.92.28.14.47.21.54.33.07.12.07.68-.17 1.36z" />
                    </svg>
                    WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>
          {mp3DirectUrl && (
            <audio
              ref={audioRef}
              src={mp3DirectUrl}
              preload="none"
              className="hidden"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onLoadedMetadata={(event) => setMediaDuration(event.currentTarget.duration)}
              onTimeUpdate={(event) => {
                const audio = event.currentTarget;
                setElapsed(audio.currentTime);
                if (audio.duration) setProgress((audio.currentTime / audio.duration) * 1000);
              }}
            />
          )}
        </div>
      </div>
      </div>
      {!canPlay && !stuck && (
        <p className="mt-2 text-xs text-slate-500">
          Doğrudan ses dosyası yok. Spotify, YouTube veya MP3 adresini eklediğinde oynatıcı bağlanır.
        </p>
      )}
    </div>
  );
}
