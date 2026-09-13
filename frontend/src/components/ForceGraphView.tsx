import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Target, 
  Sliders, 
  RotateCcw, 
  X, 
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import { GraphNode, GraphEdge, getCategoryColor, getCategoryStyle } from '../types';

export interface ForceGraphViewProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  className?: string;
}

// Convert hex to rgba helper
function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Helper to extract node ID from string or node object
function getEndpointId(endpoint: string | GraphNode | { id?: string | number } | undefined): string {
  if (!endpoint) return '';
  if (typeof endpoint === 'object') {
    return String(endpoint.id ?? '');
  }
  return String(endpoint);
}

// Default Obsidian Physics Constants
const DEFAULT_CHARGE = -220;
const DEFAULT_LINK_DISTANCE = 95;
const DEFAULT_CENTER_GRAVITY = 0.15;

export const ForceGraphView: React.FC<ForceGraphViewProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphEdge>>();

  // Container dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 520,
  });

  // Hover & selection states
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [isPhysicsOpen, setIsPhysicsOpen] = useState<boolean>(false);
  const [currentZoom, setCurrentZoom] = useState<number>(1);

  // Physics simulation tuning parameters
  const [chargeStrength, setChargeStrength] = useState<number>(DEFAULT_CHARGE);
  const [linkDistance, setLinkDistance] = useState<number>(DEFAULT_LINK_DISTANCE);
  const [centerStrength, setCenterStrength] = useState<number>(DEFAULT_CENTER_GRAVITY);

  // Measure container dimensions dynamically
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        if (clientWidth > 0 && clientHeight > 0) {
          setDimensions({ width: clientWidth, height: clientHeight });
        }
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Format and clone graph data for react-force-graph-2d
  const graphData = useMemo(() => {
    return {
      nodes: nodes.map((node) => ({
        ...node,
        val: node.val || 5,
      })),
      links: edges.map((edge) => ({
        ...edge,
        source: getEndpointId(edge.source),
        target: getEndpointId(edge.target),
      })),
    };
  }, [nodes, edges]);

  // Precompute adjacency map for O(1) neighbor lookups
  const neighborsMap = useMemo(() => {
    const neighbors = new Map<string, Set<string>>();

    nodes.forEach((n) => {
      neighbors.set(n.id, new Set());
    });

    edges.forEach((e) => {
      const sId = getEndpointId(e.source);
      const tId = getEndpointId(e.target);

      if (sId && tId) {
        if (!neighbors.has(sId)) neighbors.set(sId, new Set());
        if (!neighbors.has(tId)) neighbors.set(tId, new Set());
        neighbors.get(sId)!.add(tId);
        neighbors.get(tId)!.add(sId);
      }
    });

    return neighbors;
  }, [nodes, edges]);

  // Compute 1st-degree neighbors of current hovered node
  const hoverNeighbors = useMemo(() => {
    if (!hoverNode) return new Set<string>();
    return neighborsMap.get(hoverNode.id) || new Set<string>();
  }, [hoverNode, neighborsMap]);

  // Apply D3 physics force configurations
  useEffect(() => {
    if (!fgRef.current) return;

    // Apply repulsive charge (Coulomb's Law)
    const charge = fgRef.current.d3Force('charge');
    if (charge && typeof (charge as any).strength === 'function') {
      (charge as any).strength(chargeStrength);
    }

    // Apply link spring distance
    const link = fgRef.current.d3Force('link');
    if (link && typeof (link as any).distance === 'function') {
      (link as any).distance(linkDistance);
    }

    // Apply center gravity
    const center = fgRef.current.d3Force('center');
    if (center && typeof (center as any).strength === 'function') {
      (center as any).strength(centerStrength);
    }

    fgRef.current.d3ReheatSimulation();
  }, [chargeStrength, linkDistance, centerStrength]);

  // Initial camera framing
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      if (fgRef.current) {
        fgRef.current.zoomToFit(400, 50);
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [nodes]);

  // Reset physics to Obsidian defaults
  const handleResetPhysics = () => {
    setChargeStrength(DEFAULT_CHARGE);
    setLinkDistance(DEFAULT_LINK_DISTANCE);
    setCenterStrength(DEFAULT_CENTER_GRAVITY);
  };

  // Camera Controls
  const handleZoomIn = () => {
    if (!fgRef.current) return;
    const z = fgRef.current.zoom();
    fgRef.current.zoom(z * 1.3, 300);
  };

  const handleZoomOut = () => {
    if (!fgRef.current) return;
    const z = fgRef.current.zoom();
    fgRef.current.zoom(z / 1.3, 300);
  };

  const handleFitView = () => {
    if (!fgRef.current) return;
    fgRef.current.zoomToFit(400, 40);
  };

  const handleCenterSelected = () => {
    if (!fgRef.current || !selectedNode) return;
    const found = graphData.nodes.find((n) => n.id === selectedNode.id);
    if (found && found.x !== undefined && found.y !== undefined) {
      fgRef.current.centerAt(found.x, found.y, 500);
      fgRef.current.zoom(2.2, 500);
    }
  };

  // Node Click: centers camera and zooms smoothly onto clicked node
  const handleNodeClick = (node: any) => {
    onSelectNode(node as GraphNode);
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 500);
      fgRef.current.zoom(2.0, 500);
    }
  };

  // Helper to check if link connects to a given node
  const isLinkConnectedTo = useCallback((link: any, nodeId: string): boolean => {
    const sId = getEndpointId(link.source);
    const tId = getEndpointId(link.target);
    return sId === nodeId || tId === nodeId;
  }, []);

  // Custom Canvas Node Painting (Obsidian Visual Style)
  const paintNodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const baseR = Math.max(5, Math.min(14, (node.val || 5) * 1.5));
      const categoryColor = getCategoryColor(node.category);

      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoverNode?.id === node.id;
      const isNeighbor = hoverNeighbors.has(node.id);

      // Opacity handling: Dim unrelated nodes to 15% opacity on hover
      let alpha = 0.92;
      if (hoverNode) {
        if (isHovered) {
          alpha = 1.0;
        } else if (isNeighbor) {
          alpha = 0.95;
        } else {
          alpha = 0.15; // Dimmed
        }
      } else if (isSelected) {
        alpha = 1.0;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // 1. RADIANT HALO / AURA
      if (isSelected) {
        // Selected node highlighted with radiant aura pulse
        const pulse = Math.sin(Date.now() / 320) * 0.12 + 1.0;
        const auraR = baseR * 3.6 * pulse;
        const auraGrad = ctx.createRadialGradient(x, y, baseR * 0.8, x, y, auraR);
        auraGrad.addColorStop(0, hexToRgba(categoryColor, 0.65));
        auraGrad.addColorStop(0.45, hexToRgba(categoryColor, 0.25));
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(x, y, auraR, 0, 2 * Math.PI);
        ctx.fill();

        // High luminance white selection ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.0 / globalScale;
        ctx.setLineDash([4 / globalScale, 2 / globalScale]);
        ctx.beginPath();
        ctx.arc(x, y, baseR + 4.5 / globalScale, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (isHovered) {
        // Hover highlight ring & cyan aura
        const hoverR = baseR * 2.8;
        const hoverGrad = ctx.createRadialGradient(x, y, baseR * 0.5, x, y, hoverR);
        hoverGrad.addColorStop(0, hexToRgba('#38bdf8', 0.55));
        hoverGrad.addColorStop(0.5, hexToRgba('#38bdf8', 0.2));
        hoverGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = hoverGrad;
        ctx.beginPath();
        ctx.arc(x, y, hoverR, 0, 2 * Math.PI);
        ctx.fill();

        // Vibrant connection ring
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8 / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, baseR + 3 / globalScale, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        // Ambient soft colored halo
        const ambientR = baseR * 1.8;
        const ambientGrad = ctx.createRadialGradient(x, y, baseR * 0.4, x, y, ambientR);
        ambientGrad.addColorStop(0, hexToRgba(categoryColor, 0.35));
        ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambientGrad;
        ctx.beginPath();
        ctx.arc(x, y, ambientR, 0, 2 * Math.PI);
        ctx.fill();
      }

      // 2. CENTRAL ORB (Sphere glass depth)
      const orbGrad = ctx.createRadialGradient(
        x - baseR * 0.3,
        y - baseR * 0.3,
        baseR * 0.1,
        x,
        y,
        baseR
      );
      orbGrad.addColorStop(0, '#ffffff'); // bright specular reflection
      orbGrad.addColorStop(0.25, categoryColor);
      orbGrad.addColorStop(1, hexToRgba(categoryColor, 0.85));

      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(x, y, baseR, 0, 2 * Math.PI);
      ctx.fill();

      // Sharp perimeter rim
      ctx.strokeStyle = isSelected
        ? '#ffffff'
        : isHovered
        ? '#38bdf8'
        : 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = (isSelected ? 1.5 : 0.8) / globalScale;
      ctx.beginPath();
      ctx.arc(x, y, baseR, 0, 2 * Math.PI);
      ctx.stroke();

      // 3. CRISP TYPOGRAPHY LABELS
      const shouldShowLabel = globalScale > 0.45 || isHovered || isSelected || isNeighbor;
      if (shouldShowLabel) {
        const label = node.label || node.id;
        const fontSize = Math.max(9, Math.min(13, 11 / Math.sqrt(globalScale)));

        ctx.font = `${isSelected || isHovered ? '600' : '500'} ${fontSize}px Inter, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const textY = y + baseR + 4 / globalScale;

        // Dark background stroke for pristine Obsidian contrast over dark canvas and edges
        ctx.strokeStyle = '#070A10';
        ctx.lineWidth = 3 / globalScale;
        ctx.lineJoin = 'round';
        ctx.strokeText(label, x, textY);

        // Foreground label text
        if (isSelected) {
          ctx.fillStyle = '#ffffff';
        } else if (isHovered) {
          ctx.fillStyle = '#38bdf8';
        } else if (isNeighbor) {
          ctx.fillStyle = '#e2e8f0';
        } else {
          ctx.fillStyle = '#cbd5e1';
        }
        ctx.fillText(label, x, textY);
      }

      ctx.restore();
    },
    [selectedNode, hoverNode, hoverNeighbors]
  );

  // Pointer Area Hitbox (matches node radius + padding for effortless clicking)
  const handlePointerAreaPaint = useCallback(
    (node: any, paintColor: string, ctx: CanvasRenderingContext2D) => {
      const baseR = Math.max(5, Math.min(14, (node.val || 5) * 1.5)) + 6;
      ctx.fillStyle = paintColor;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, baseR, 0, 2 * Math.PI);
      ctx.fill();
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full min-h-[480px] bg-[#070A10] select-none overflow-hidden rounded-xl ${className}`}
    >
      {/* Underlying Obsidian Force-Directed Canvas */}
      <ForceGraph2D
        ref={fgRef as any}
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        backgroundColor="#070A10"
        nodeCanvasObject={paintNodeCanvasObject}
        nodePointerAreaPaint={handlePointerAreaPaint}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoverNode((node as GraphNode) || null)}
        onBackgroundClick={() => onSelectNode(null)}
        onZoom={(transform) => setCurrentZoom(transform.k)}
        enableNodeDrag={true}
        d3VelocityDecay={0.35}
        d3AlphaDecay={0.02}
        warmupTicks={30}
        cooldownTicks={120}
        // Link Styling & Neighbor Dimming
        linkColor={(link: any) => {
          if (hoverNode) {
            return isLinkConnectedTo(link, hoverNode.id)
              ? '#38bdf8' // Highlight active connection with vibrant cyan
              : 'rgba(255, 255, 255, 0.05)'; // Dim unrelated links to 5% opacity
          }
          if (selectedNode && isLinkConnectedTo(link, selectedNode.id)) {
            return 'rgba(56, 189, 248, 0.7)';
          }
          return 'rgba(255, 255, 255, 0.18)';
        }}
        linkWidth={(link: any) => {
          if (hoverNode) {
            return isLinkConnectedTo(link, hoverNode.id) ? 2.4 : 0.6;
          }
          if (selectedNode && isLinkConnectedTo(link, selectedNode.id)) {
            return 1.8;
          }
          return 1.0;
        }}
        // Directional Particle Flow Dynamics
        linkDirectionalParticles={(link: any) => {
          if (hoverNode) {
            return isLinkConnectedTo(link, hoverNode.id) ? 4 : 0;
          }
          if (selectedNode && isLinkConnectedTo(link, selectedNode.id)) {
            return 3;
          }
          return 1;
        }}
        linkDirectionalParticleSpeed={(link: any) => {
          if (hoverNode && isLinkConnectedTo(link, hoverNode.id)) return 0.008;
          return 0.004;
        }}
        linkDirectionalParticleWidth={(link: any) => {
          if (hoverNode && isLinkConnectedTo(link, hoverNode.id)) return 2.8;
          if (selectedNode && isLinkConnectedTo(link, selectedNode.id)) return 2.2;
          return 1.6;
        }}
        linkDirectionalParticleColor={(link: any) => {
          if (hoverNode && isLinkConnectedTo(link, hoverNode.id)) return '#38bdf8';
          if (selectedNode && isLinkConnectedTo(link, selectedNode.id)) return '#38bdf8';
          return 'rgba(56, 189, 248, 0.7)';
        }}
      />

      {/* Floating Camera & Viewport Controls Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#101622]/80 backdrop-blur-md border border-white/10 shadow-lg">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
        <button
          onClick={handleFitView}
          title="Fit to Screen"
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {selectedNode && (
          <button
            onClick={handleCenterSelected}
            title={`Center on "${selectedNode.label}"`}
            className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
          >
            <Target className="w-4 h-4" />
          </button>
        )}

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        <button
          onClick={() => setIsPhysicsOpen(!isPhysicsOpen)}
          title="Obsidian Physics Settings"
          className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
            isPhysicsOpen
              ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Collapsible Physics Settings Panel */}
      {isPhysicsOpen && (
        <div className="absolute top-16 right-4 z-30 w-72 p-4 rounded-2xl bg-[#101622]/95 backdrop-blur-xl border border-white/15 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Graph Physics
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetPhysics}
                title="Reset to defaults"
                className="p-1 text-slate-400 hover:text-sky-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsPhysicsOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Repulsion Force Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Repulsion (Charge)</span>
              <span className="font-mono text-sky-400 font-semibold">{chargeStrength}</span>
            </div>
            <input
              type="range"
              min="-600"
              max="-50"
              step="10"
              value={chargeStrength}
              onChange={(e) => setChargeStrength(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
            <p className="text-[10px] text-slate-500">
              Coulomb electrostatic repulsion pushing concepts apart.
            </p>
          </div>

          {/* Link Distance Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Link Distance</span>
              <span className="font-mono text-emerald-400 font-semibold">{linkDistance}px</span>
            </div>
            <input
              type="range"
              min="30"
              max="250"
              step="5"
              value={linkDistance}
              onChange={(e) => setLinkDistance(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <p className="text-[10px] text-slate-500">
              Resting length of elastic relationship springs.
            </p>
          </div>

          {/* Center Gravity Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Center Gravity</span>
              <span className="font-mono text-violet-400 font-semibold">{centerStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.02"
              value={centerStrength}
              onChange={(e) => setCenterStrength(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-400"
            />
            <p className="text-[10px] text-slate-500">
              Gravitational pull centering the graph in the viewport.
            </p>
          </div>
        </div>
      )}

      {/* Hover Node Tooltip Card */}
      {hoverNode && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none max-w-xs p-3 rounded-xl bg-[#101622]/90 backdrop-blur-md border border-white/15 shadow-2xl space-y-1 animate-in fade-in duration-150">
          <div className="flex items-center justify-between gap-2">
            {(() => {
              const style = getCategoryStyle(hoverNode.category);
              return (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.border} ${style.bg} ${style.text}`}>
                  {hoverNode.category}
                </span>
              );
            })()}
            <span className="text-[10px] font-mono text-slate-400">
              {hoverNode.timestamp_formatted}
            </span>
          </div>
          <h4 className="text-xs font-bold text-white line-clamp-1">{hoverNode.label}</h4>
          <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
            {hoverNode.summary}
          </p>
          <div className="text-[10px] text-sky-400 font-medium pt-0.5">
            {hoverNeighbors.size} connected {hoverNeighbors.size === 1 ? 'concept' : 'concepts'} • Click to inspect
          </div>
        </div>
      )}

      {/* Bottom Right Graph Status HUD */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#101622]/70 backdrop-blur-md border border-white/10 text-[11px] text-slate-400 pointer-events-none">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3 h-3 text-sky-400" />
          <strong className="text-slate-200">{nodes.length}</strong> nodes
        </span>
        <span className="text-white/20">•</span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <strong className="text-slate-200">{edges.length}</strong> links
        </span>
        <span className="text-white/20">•</span>
        <span className="font-mono text-slate-400">
          {Math.round(currentZoom * 100)}%
        </span>
      </div>
    </div>
  );
};

export default ForceGraphView;
