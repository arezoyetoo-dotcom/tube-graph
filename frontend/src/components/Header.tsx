import React from 'react';
import { Network, Sparkles, Loader2, Play, Youtube, X } from 'lucide-react';

export interface DemoVideo {
  id: string;
  title: string;
  creator: string;
  url: string;
}

export const DEMO_VIDEOS: DemoVideo[] = [
  {
    id: 'wjZofJX0v4U',
    title: 'Visualizing Attention & Transformers',
    creator: '3Blue1Brown',
    url: 'https://www.youtube.com/watch?v=wjZofJX0v4U',
  },
  {
    id: 'kCc8FmEb1nY',
    title: 'Intro to Large Language Models',
    creator: 'Andrej Karpathy',
    url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
  },
];

interface HeaderProps {
  url: string;
  onUrlChange: (newUrl: string) => void;
  onAnalyze: (targetUrl?: string) => void;
  isLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  url,
  onUrlChange,
  onAnalyze,
  isLoading,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onAnalyze();
    }
  };

  const handleSelectDemo = (demo: DemoVideo) => {
    onUrlChange(demo.url);
    onAnalyze(demo.url);
  };

  return (
    <header className="border-b border-white/10 bg-[#070A10]/95 backdrop-blur-md sticky top-0 z-40 px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Top row: Brand & Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-400/30 shadow-glow-cyan">
              <Network className="w-5 h-5 text-sky-400 animate-pulse" />
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                Tube<span className="text-sky-400">Graph</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase bg-sky-500/10 border border-sky-400/25 text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                Obsidian Graph Edition
              </span>
            </div>
          </div>

          {/* Quick status indicator or desktop tagline */}
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              API: Ready
            </span>
            <span className="text-slate-600">|</span>
            <span>Desktop 60 FPS</span>
          </div>
        </div>

        {/* Middle row: YouTube URL Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
              <Youtube className="w-5 h-5 text-rose-500/80" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder="Paste any YouTube URL (e.g., https://www.youtube.com/watch?v=wjZofJX0v4U)..."
              disabled={isLoading}
              className="w-full pl-11 pr-10 py-2.5 text-sm bg-[#101622]/90 border border-white/10 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-2 focus:ring-sky-500/20 focus:shadow-glow-cyan transition-all disabled:opacity-50"
            />
            {url && !isLoading && (
              <button
                type="button"
                onClick={() => onUrlChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!url.trim() || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-sky-500 disabled:hover:to-cyan-500 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Mapping Graph...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
                <span>Analyze & Map</span>
              </>
            )}
          </button>
        </form>

        {/* Bottom row: Demo Video Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          <span className="text-xs font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Play className="w-3 h-3 text-sky-400 fill-sky-400" />
            Quick Demos:
          </span>
          {DEMO_VIDEOS.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => handleSelectDemo(demo)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#101622]/80 hover:bg-[#162032] border border-white/10 hover:border-sky-400/40 text-slate-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="font-semibold text-sky-400 group-hover:underline">
                {demo.creator}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 truncate max-w-[200px] sm:max-w-none">
                {demo.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
