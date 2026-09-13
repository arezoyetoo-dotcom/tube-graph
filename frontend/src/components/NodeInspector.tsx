import React, { useState, useMemo, useEffect } from 'react';
import { 
  GraphNode, 
  GraphEdge, 
  ExportObsidianResponse, 
  getCategoryStyle 
} from '../types';
import { 
  X, 
  Play, 
  Clock, 
  ExternalLink, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FolderSync, 
  Check, 
  Copy, 
  Loader2, 
  Network,
  AlertCircle
} from 'lucide-react';
import { formatSeconds } from './VideoPlayerModal';

export interface NodeInspectorProps {
  selectedNode: GraphNode | null;
  videoId: string;
  videoTitle: string;
  allNodes: GraphNode[];
  allEdges: GraphEdge[];
  onSelectNode: (node: GraphNode | null) => void;
  onClose: () => void;
  onExportObsidian: () => Promise<void>;
  onJumpToTimestamp: (seconds: number) => void;
  isExporting?: boolean;
  exportStatus?: ExportObsidianResponse | null;
  exportError?: string | null;
}

/**
 * Normalizes a file path to Windows style if it originated from WSL /mnt/d
 * to confirm vault paths like D:\py\projects\TubeGraph-Vault\...
 */
export function formatVaultPath(rawPath?: string): string {
  if (!rawPath) return '';
  if (rawPath.startsWith('/mnt/')) {
    const driveLetter = rawPath.charAt(5).toUpperCase();
    const rest = rawPath.slice(6).replace(/\//g, '\\');
    return `${driveLetter}:${rest}`;
  }
  return rawPath;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({
  selectedNode,
  videoId,
  videoTitle,
  allNodes,
  allEdges,
  onSelectNode,
  onClose,
  onExportObsidian,
  onJumpToTimestamp,
  isExporting = false,
  exportStatus = null,
  exportError = null,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedNode) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, onClose]);

  // Compute incoming and outgoing neighbors with relationships
  const connectedConcepts = useMemo(() => {
    if (!selectedNode) return { outgoing: [], incoming: [] };

    const idMap = new Map<string, GraphNode>();
    const labelMap = new Map<string, GraphNode>();
    allNodes.forEach((n) => {
      idMap.set(n.id, n);
      labelMap.set(n.label.toLowerCase(), n);
    });

    const resolveNode = (
      ref: string | GraphNode | { id?: string | number; label?: string } | undefined
    ): GraphNode | undefined => {
      if (!ref) return undefined;
      if (typeof ref === 'object') {
        if (ref.id && idMap.has(String(ref.id))) return idMap.get(String(ref.id));
        if (ref.label && labelMap.has(ref.label.toLowerCase())) return labelMap.get(ref.label.toLowerCase());
        return ref as GraphNode;
      }
      const str = String(ref);
      return idMap.get(str) || labelMap.get(str.toLowerCase());
    };

    const outgoing: { node: GraphNode; relationship: string }[] = [];
    const incoming: { node: GraphNode; relationship: string }[] = [];

    const currentId = selectedNode.id;
    const currentLabel = selectedNode.label.toLowerCase();

    allEdges.forEach((edge) => {
      const sNode = resolveNode(edge.source);
      const tNode = resolveNode(edge.target);

      const isSourceMatch =
        sNode?.id === currentId || (sNode?.label && sNode.label.toLowerCase() === currentLabel);
      const isTargetMatch =
        tNode?.id === currentId || (tNode?.label && tNode.label.toLowerCase() === currentLabel);

      if (isSourceMatch && tNode && tNode.id !== currentId) {
        outgoing.push({ node: tNode, relationship: edge.relationship || 'connects to' });
      } else if (isTargetMatch && sNode && sNode.id !== currentId) {
        incoming.push({ node: sNode, relationship: edge.relationship || 'referenced by' });
      }
    });

    // Deduplicate entries by node ID
    const dedupOutgoing = outgoing.filter(
      (item, idx, self) => idx === self.findIndex((t) => t.node.id === item.node.id)
    );
    const dedupIncoming = incoming.filter(
      (item, idx, self) => idx === self.findIndex((t) => t.node.id === item.node.id)
    );

    return { outgoing: dedupOutgoing, incoming: dedupIncoming };
  }, [selectedNode, allNodes, allEdges]);

  const handleCopyPath = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedNode) {
    return (
      <aside 
        aria-label="Concept Inspector"
        className="fixed top-0 right-0 h-full w-[440px] max-w-full z-40 pointer-events-none translate-x-full transition-transform duration-300 ease-in-out"
      />
    );
  }

  const categoryStyle = getCategoryStyle(selectedNode.category);
  const formattedTime = selectedNode.timestamp_formatted || formatSeconds(selectedNode.timestamp_seconds);
  const externalYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(selectedNode.timestamp_seconds)}s`;
  const vaultDisplayPath = formatVaultPath(exportStatus?.export_dir);

  return (
    <aside
      aria-label="Concept Inspector"
      className="fixed top-0 right-0 h-full w-[440px] max-w-full z-40 bg-[#070A10]/95 backdrop-blur-2xl border-l border-white/10 shadow-obsidian-card flex flex-col transition-transform duration-300 ease-in-out translate-x-0"
    >
      {/* Top Header Bar */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-[#101622]/80 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Concept Inspector
            </h2>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
              {videoTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close Inspector (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Category & Title Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${categoryStyle.border} ${categoryStyle.bg} ${categoryStyle.text}`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: categoryStyle.hex }}
              />
              {selectedNode.category}
            </span>

            <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formattedTime}
            </span>
          </div>

          <h3 className="text-xl font-bold text-white tracking-tight leading-snug">
            {selectedNode.label}
          </h3>

          {/* Simple punchy 1-2 sentence summary */}
          {selectedNode.summary && (
            <p className="text-sm font-medium text-sky-200/90 leading-relaxed">
              {selectedNode.summary}
            </p>
          )}
        </div>

        {/* Video Jump Timestamp Action Button */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-sky-500/10 via-[#101622] to-violet-500/10 border border-sky-500/20 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onJumpToTimestamp(selectedNode.timestamp_seconds)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 active:scale-[0.98]"
            title={`Play video at ${formattedTime}`}
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>▶ Jump to {formattedTime}</span>
          </button>

          <a
            href={externalYoutubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="Open YouTube directly in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Detailed Concept Description */}
        {selectedNode.description && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Concept Detail
            </h4>
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-slate-300 leading-relaxed">
              {selectedNode.description}
            </div>
          </div>
        )}

        {/* Key Points Bullet List (2-3 punchy bullet points) */}
        {selectedNode.key_points && selectedNode.key_points.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Core Takeaways</span>
              <span className="text-[10px] text-slate-500 font-normal">
                ({selectedNode.key_points.length})
              </span>
            </h4>
            <ul className="space-y-2">
              {selectedNode.key_points.map((point, idx) => (
                <li
                  key={idx}
                  className="p-2.5 rounded-lg bg-black/20 border border-white/5 flex items-start gap-2.5 text-xs text-slate-200"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: categoryStyle.hex }}
                  />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Connected Concepts Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-sky-400" />
              <span>Connected Concepts</span>
            </h4>
            <span className="text-[11px] text-slate-500 font-mono">
              {connectedConcepts.outgoing.length + connectedConcepts.incoming.length} links
            </span>
          </div>

          {connectedConcepts.outgoing.length === 0 && connectedConcepts.incoming.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 rounded-lg bg-white/[0.02] border border-white/5">
              No direct adjacent concepts for this node.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Outgoing Concepts */}
              {connectedConcepts.outgoing.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-sky-400/80 uppercase tracking-wider flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" />
                    Connects To
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {connectedConcepts.outgoing.map(({ node, relationship }) => {
                      const nStyle = getCategoryStyle(node.category);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => onSelectNode(node)}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-sky-500/40 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: nStyle.hex }}
                              />
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                                {node.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                              ↳ {relationship}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {node.timestamp_formatted || formatSeconds(node.timestamp_seconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Incoming Concepts */}
              {connectedConcepts.incoming.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-emerald-400/80 uppercase tracking-wider flex items-center gap-1">
                    <ArrowLeft className="w-3 h-3" />
                    Referenced By
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {connectedConcepts.incoming.map(({ node, relationship }) => {
                      const nStyle = getCategoryStyle(node.category);
                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => onSelectNode(node)}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-emerald-500/40 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: nStyle.hex }}
                              />
                              <span className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">
                                {node.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block truncate">
                              ↳ {relationship}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            {node.timestamp_formatted || formatSeconds(node.timestamp_seconds)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Obsidian Export Card in Drawer */}
        <div className="pt-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FolderSync className="w-3.5 h-3.5 text-violet-400" />
              <span>Obsidian Vault</span>
            </h4>
            {exportStatus?.success && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                Synced
              </span>
            )}
          </div>

          {exportError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{exportError}</span>
            </div>
          )}

          {exportStatus?.success ? (
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Knowledge Graph Exported to Vault</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Exported {exportStatus.files_count ?? allNodes.length + 1} notes with bidirectional [[wikilinks]] to:
              </p>
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-black/40 border border-white/10">
                <code className="text-[11px] font-mono text-emerald-200 truncate select-all">
                  {vaultDisplayPath}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyPath(vaultDisplayPath)}
                  className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
                  title="Copy Vault Path"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onExportObsidian}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 hover:border-violet-400/50 text-violet-200 text-xs font-semibold transition-all shadow-md shadow-violet-950/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-300" />
                  <span>Exporting to Obsidian Vault...</span>
                </>
              ) : (
                <>
                  <FolderSync className="w-3.5 h-3.5 text-violet-400" />
                  <span>Export Graph to Obsidian Vault</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
