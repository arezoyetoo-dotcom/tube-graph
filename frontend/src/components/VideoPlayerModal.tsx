import React, { useState, useEffect } from 'react';
import { 
  Play, 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Clock,
  Film
} from 'lucide-react';

export interface VideoPlayerModalProps {
  videoId: string;
  videoTitle?: string;
  channel?: string;
  seekTime: number; // in seconds
  isOpen: boolean;
  onClose: () => void;
}

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) {
    return `${h}:${(m % 60).toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  videoId,
  videoTitle = 'YouTube Video',
  channel,
  seekTime,
  isOpen,
  onClose,
}) => {
  // Player state: 'docked' (picture-in-picture style), 'modal' (expanded center), 'minimized' (compact pill)
  const [mode, setMode] = useState<'docked' | 'modal' | 'minimized'>('docked');

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (mode === 'modal') {
          setMode('docked');
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, mode, onClose]);

  if (!isOpen || !videoId) return null;

  // Clean iframe embed URL with timestamp seek and autoplay
  const startParam = Math.max(0, Math.floor(seekTime));
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?start=${startParam}&autoplay=1&enablejsapi=1&rel=0`;
  const externalUrl = `https://www.youtube.com/watch?v=${videoId}&t=${startParam}s`;

  // MINIMIZED PILL VIEW
  if (mode === 'minimized') {
    return (
      <div 
        onClick={() => setMode('docked')}
        className="fixed bottom-6 right-6 z-50 rounded-xl glass-panel border border-sky-500/30 shadow-glow-cyan px-4 py-2.5 flex items-center gap-3 bg-[#070A10]/95 backdrop-blur-xl transition-all hover:border-sky-400 cursor-pointer group"
      >
        <div className="w-6 h-6 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
          <Play className="w-3 h-3 fill-sky-400" />
        </div>
        <div className="text-xs">
          <p className="font-semibold text-white truncate max-w-[180px]">
            {videoTitle}
          </p>
          <p className="text-[11px] text-sky-300 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3 text-sky-400" />
            {formatSeconds(seekTime)}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2 text-slate-400 group-hover:text-white">
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); setMode('docked'); }}
            className="p-1 hover:text-sky-300 transition-colors"
            title="Expand player"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="p-1 hover:text-rose-400 transition-colors"
            title="Close player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // MODAL / EXPANDED FULL VIEW
  if (mode === 'modal') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 transition-all">
        <div className="w-full max-w-4xl rounded-2xl glass-panel border border-white/15 shadow-obsidian-card overflow-hidden flex flex-col bg-[#070A10]/95">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3 bg-[#101622]/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Film className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {videoTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  {channel && <span>{channel}</span>}
                  <span className="text-slate-600">•</span>
                  <span className="text-sky-300 font-mono font-medium">
                    {formatSeconds(seekTime)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 text-slate-400">
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-colors"
                title="Open in YouTube (new tab)"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setMode('docked')}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-slate-200 transition-colors"
                title="Dock player (Bottom-Right)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport */}
          <div className="relative w-full aspect-video bg-black">
            <iframe
              key={`${videoId}-${seekTime}`}
              src={embedUrl}
              title={videoTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    );
  }

  // DOCKED CORNER VIEW (Default, bottom-right picture-in-picture)
  return (
    <aside 
      aria-label="Synchronized YouTube Video Player"
      className="fixed bottom-6 right-6 w-[430px] max-w-[calc(100vw-3rem)] z-40 rounded-2xl overflow-hidden glass-panel border border-sky-500/20 shadow-obsidian-card backdrop-blur-xl flex flex-col bg-[#070A10]/95 transition-all duration-300"
    >
      {/* Header Bar */}
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2 bg-[#101622]/90 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
            <Play className="w-3 h-3 fill-rose-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate max-w-[200px]">
              {videoTitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-400/30 text-sky-300">
            {formatSeconds(seekTime)}
          </span>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-md hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Open in YouTube (new tab)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={() => setMode('modal')}
            className="p-1 rounded-md hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Expand to modal"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setMode('minimized')}
            className="p-1 rounded-md hover:bg-white/10 hover:text-slate-200 transition-colors"
            title="Minimize"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Embedded Iframe */}
      <div className="relative w-full aspect-video bg-black">
        <iframe
          key={`${videoId}-${seekTime}`}
          src={embedUrl}
          title={videoTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </aside>
  );
};
