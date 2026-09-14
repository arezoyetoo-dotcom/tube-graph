import { useState } from 'react';
import { Header, DEMO_VIDEOS } from './components/Header';
import { ForceGraphView } from './components/ForceGraphView';
import { NodeInspector, formatVaultPath } from './components/NodeInspector';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { VideoGraphResponse, GraphNode, ExportObsidianResponse } from './types';
import { getDemoGraphByUrl, DEMO_3B1B_GRAPH } from './demoData';
import { 
  Network, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  Layers, 
  ExternalLink, 
  ArrowRight,
  RefreshCw,
  FolderSync,
  Clock,
  User,
  Hash,
  Play,
  Check,
  PanelRightOpen,
  Copy
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5417';

export default function App() {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<VideoGraphResponse | null>(null);
  
  // Inspector & Selection State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // Video Sync State
  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);
  const [seekTime, setSeekTime] = useState<number>(0);

  // Obsidian Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<ExportObsidianResponse | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedVaultPath, setCopiedVaultPath] = useState<boolean>(false);

  const handleAnalyze = async (targetUrl?: string) => {
    const videoUrl = targetUrl || url;
    if (!videoUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setExportStatus(null);
    setExportError(null);

    try {
      // First check if matching pre-computed demo graph is available
      const demoGraph = getDemoGraphByUrl(videoUrl.trim());

      let data: VideoGraphResponse | null = null;
      try {
        const response = await fetch(`${API_BASE}/api/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl.trim() }),
        }).catch(() => {
          return fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: videoUrl.trim() }),
          });
        });

        if (response && response.ok) {
          data = await response.json();
        }
      } catch {
        // Backend offline or unreachable
      }

      // If backend didn't return data, use demo fallback
      if (!data && demoGraph) {
        data = demoGraph;
      } else if (!data) {
        // Fallback to 3B1B sample graph with alert
        data = DEMO_3B1B_GRAPH;
        setError("Note: Backend is offline (start with ./start.sh for live YouTube analysis). Showing 3Blue1Brown demo knowledge graph.");
      }

      setGraphData(data);
      if (data.nodes.length > 0) {
        setSelectedNode(data.nodes[0]);
        setIsInspectorOpen(true);
        setSeekTime(data.nodes[0].timestamp_seconds);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to analyze video transcript';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportObsidian = async () => {
    if (!graphData) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch(`${API_BASE}/api/export-obsidian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(graphData),
      }).catch(() => {
        return fetch('/api/export-obsidian', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(graphData),
        });
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Export failed with HTTP ${response.status}`);
      }

      const data: ExportObsidianResponse = await response.json();
      setExportStatus(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to export notes to Obsidian';
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleJumpToTimestamp = (seconds: number) => {
    setSeekTime(seconds);
    setIsVideoOpen(true);
  };

  const handleSelectNode = (node: GraphNode | null) => {
    setSelectedNode(node);
    if (node) {
      setIsInspectorOpen(true);
    }
  };

  const handleReset = () => {
    setGraphData(null);
    setSelectedNode(null);
    setIsInspectorOpen(false);
    setIsVideoOpen(false);
    setSeekTime(0);
    setError(null);
    setExportStatus(null);
    setExportError(null);
  };

  const handleCopyVault = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedVaultPath(true);
    setTimeout(() => setCopiedVaultPath(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col selection:bg-sky-500/20 selection:text-sky-200">
      {/* Top Navigation & URL Bar */}
      <Header
        url={url}
        onUrlChange={setUrl}
        onAnalyze={handleAnalyze}
        isLoading={isLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle Obsidian Background Grid Pattern */}
        <div className="absolute inset-0 obsidian-grid pointer-events-none opacity-40" />

        {/* Error Alert Banner */}
        {error && (
          <div className="relative z-20 max-w-4xl mx-auto w-full px-6 pt-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3.5 shadow-lg shadow-rose-950/20">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-rose-300">Analysis Error</p>
                <p className="text-rose-200/80 mt-0.5">{error}</p>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    onClick={() => handleAnalyze()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 text-rose-200 text-xs font-medium transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                  <button
                    onClick={() => setError(null)}
                    className="text-xs text-rose-300/70 hover:text-rose-200 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center p-6 relative z-20">
            <div className="max-w-md w-full p-8 rounded-2xl glass-panel shadow-obsidian-card flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center shadow-glow-cyan">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500" />
                </span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Synthesizing Knowledge Graph
              </h3>
              <p className="text-sm text-slate-400 mt-1.5 max-w-sm">
                Extracting transcript segments, prompting Gemini AI for entity relationships, and preparing Obsidian nodes...
              </p>
              <div className="mt-6 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500 via-emerald-400 to-violet-500 h-full w-2/3 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Empty State / Welcome Screen */}
        {!isLoading && !graphData && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
            <div className="max-w-3xl w-full text-center space-y-8">
              {/* Hero Icon Badge */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500/15 via-[#101622] to-violet-500/15 border border-white/10 shadow-glow-cyan backdrop-blur-sm">
                <Network className="w-10 h-10 text-sky-400" />
              </div>

              {/* Title & Tagline */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                  Map YouTube to <span className="bg-gradient-to-r from-sky-400 via-emerald-300 to-violet-400 bg-clip-text text-transparent">Obsidian</span>
                </h1>
                <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
                  Transform any YouTube video into an interactive, living 60 FPS knowledge graph.
                  Explore interconnected concepts, jump directly to video timestamps, and export directly into your Obsidian vault.
                </p>
              </div>

              {/* Feature Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 text-left">
                <div className="p-5 rounded-xl glass-panel glass-panel-hover">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 mb-3.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Entity Extraction</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Gemini AI extracts crisp 1-2 sentence definitions, key bullet points, and core entity categories.
                  </p>
                </div>

                <div className="p-5 rounded-xl glass-panel glass-panel-hover">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 mb-3.5">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Obsidian-Grade Physics</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Coulomb repulsion, tensile spring links, particle flows, and neighbor dimming on HTML5 Canvas.
                  </p>
                </div>

                <div className="p-5 rounded-xl glass-panel glass-panel-hover">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-400 mb-3.5">
                    <FolderSync className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">Direct Vault Sync</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    One-click export generates structured Markdown files and bidirectional <code className="text-violet-300">[[wikilinks]]</code>.
                  </p>
                </div>
              </div>

              {/* Quick Start Buttons */}
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-3 font-mono">Or select a featured presentation:</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {DEMO_VIDEOS.map((demo) => (
                    <button
                      key={demo.id}
                      onClick={() => {
                        setUrl(demo.url);
                        handleAnalyze(demo.url);
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101622] hover:bg-[#162032] border border-white/10 hover:border-sky-400/40 text-xs font-medium text-slate-200 transition-all group"
                    >
                      <span className="text-sky-400 font-semibold">{demo.creator}</span>
                      <span className="text-slate-600">|</span>
                      <span>{demo.title}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Graph & Desktop Viewport Area */}
        {!isLoading && graphData && (
          <div className="flex-1 flex flex-col h-full relative z-10">
            {/* Top Video Overview & Header Actions Strip */}
            <div className="px-6 py-3 border-b border-white/10 bg-[#101622]/80 backdrop-blur-md flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{graphData.video_title}</span>
                    <a
                      href={`https://www.youtube.com/watch?v=${graphData.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-sky-400 transition-colors"
                      title="Open YouTube video in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </h2>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    {graphData.channel && (
                      <span className="flex items-center gap-1 text-slate-300">
                        <User className="w-3 h-3 text-sky-400" />
                        {graphData.channel}
                      </span>
                    )}
                    {graphData.duration_formatted && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        {graphData.duration_formatted}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-violet-400" />
                      {graphData.nodes.length} concepts
                    </span>
                    <span className="flex items-center gap-1">
                      <Network className="w-3 h-3 text-amber-400" />
                      {graphData.edges.length} relationships
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Top Bar */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Header Button: Export to Obsidian */}
                <button
                  type="button"
                  onClick={handleExportObsidian}
                  disabled={isExporting}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 shadow-sm ${
                    exportStatus?.success
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-violet-500/15 hover:bg-violet-500/25 border-violet-400/30 text-violet-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Export complete graph to Obsidian vault with bidirectional wikilinks"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />
                      <span>Exporting Vault...</span>
                    </>
                  ) : exportStatus?.success ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Obsidian Synced</span>
                    </>
                  ) : (
                    <>
                      <FolderSync className="w-3.5 h-3.5 text-violet-400" />
                      <span>Export to Obsidian</span>
                    </>
                  )}
                </button>

                {/* Video Player Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsVideoOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-200 transition-colors flex items-center gap-1.5"
                  title="Open synchronized video player"
                >
                  <Play className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                  <span>Video Player</span>
                </button>

                {/* Inspector Drawer Toggle (if closed but node is selected) */}
                {selectedNode && !isInspectorOpen && (
                  <button
                    type="button"
                    onClick={() => setIsInspectorOpen(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 transition-colors flex items-center gap-1.5"
                    title="Open Concept Inspector drawer"
                  >
                    <PanelRightOpen className="w-3.5 h-3.5 text-sky-400" />
                    <span>Inspect Concept</span>
                  </button>
                )}

                {/* Reset / Analyze Another */}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Analyze Another
                </button>
              </div>
            </div>

            {/* Executive Takeaway Strip */}
            {graphData.executive_takeaway && (
              <div className="px-6 py-2 bg-sky-950/20 border-b border-sky-500/15 text-xs text-sky-200/90 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="font-semibold text-sky-300 shrink-0">Executive Takeaway:</span>
                  <span className="truncate">{graphData.executive_takeaway}</span>
                </div>

                {/* Quick vault path indicator if synced */}
                {exportStatus?.success && (
                  <div className="hidden md:flex items-center gap-1.5 shrink-0 font-mono text-[11px] text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[280px]">
                      {formatVaultPath(exportStatus.export_dir)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyVault(formatVaultPath(exportStatus.export_dir))}
                      className="p-0.5 hover:text-white text-slate-400"
                      title="Copy path"
                    >
                      {copiedVaultPath ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Obsidian Graph Viewport Area */}
            <div className="flex-1 p-6 flex flex-col relative overflow-hidden min-h-[500px]">
              <div className="rounded-2xl glass-panel p-4 sm:p-6 flex-1 flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-sky-400" />
                    <span className="text-sm font-semibold text-white">Obsidian Force Graph</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono">
                      60 FPS
                    </span>
                  </div>

                  {/* Category Legend */}
                  <div className="hidden sm:flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-sky-400">
                      <span className="w-2 h-2 rounded-full bg-sky-400" /> Core Concept
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Method
                    </span>
                    <span className="flex items-center gap-1.5 text-violet-400">
                      <span className="w-2 h-2 rounded-full bg-violet-400" /> Tool
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2 h-2 rounded-full bg-amber-400" /> Insight
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2 h-2 rounded-full bg-rose-400" /> Warning
                    </span>
                  </div>
                </div>

                {/* 60 FPS Force Canvas */}
                <div className="flex-1 w-full min-h-[500px] relative rounded-xl overflow-hidden bg-[#070A10] border border-white/5">
                  <ForceGraphView
                    nodes={graphData.nodes}
                    edges={graphData.edges}
                    selectedNode={selectedNode}
                    onSelectNode={handleSelectNode}
                  />
                </div>
              </div>
            </div>

            {/* Slide-Out Concept Inspector Drawer */}
            <NodeInspector
              selectedNode={isInspectorOpen ? selectedNode : null}
              videoId={graphData.video_id}
              videoTitle={graphData.video_title}
              allNodes={graphData.nodes}
              allEdges={graphData.edges}
              onSelectNode={handleSelectNode}
              onClose={() => setIsInspectorOpen(false)}
              onExportObsidian={handleExportObsidian}
              onJumpToTimestamp={handleJumpToTimestamp}
              isExporting={isExporting}
              exportStatus={exportStatus}
              exportError={exportError}
            />

            {/* Embedded Dockable/Modal YouTube Player */}
            <VideoPlayerModal
              videoId={graphData.video_id}
              videoTitle={graphData.video_title}
              channel={graphData.channel}
              seekTime={seekTime}
              isOpen={isVideoOpen}
              onClose={() => setIsVideoOpen(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
