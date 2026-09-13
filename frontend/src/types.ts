export interface GraphNode {
  id: string;
  label: string;
  category: string; // "Core Concept" | "Method" | "Tool" | "Key Insight" | "Warning"
  summary: string;
  description: string;
  key_points: string[];
  timestamp_seconds: number;
  timestamp_formatted: string;
  val: number;
  // Canvas simulation coordinates & graph metadata
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  color?: string;
  neighbors?: GraphNode[];
  links?: GraphEdge[];
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  relationship: string;
  strength: number;
}

export interface VideoGraphResponse {
  video_id: string;
  video_title: string;
  channel: string;
  duration_formatted: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  executive_takeaway: string;
  vault_base?: string | null;
}

export interface AnalyzeRequest {
  url: string;
}

export interface ExportObsidianRequest {
  vault_base?: string;
  graph?: VideoGraphResponse;
}

export interface ExportObsidianResponse {
  success: boolean;
  export_dir: string;
  vault_base: string;
  video_title: string;
  nodes_exported: number;
  index_file: string;
}

export interface CategoryStyle {
  hex: string;
  border: string;
  bg: string;
  text: string;
  glow: string;
}

export const CATEGORY_COLORS: Record<string, CategoryStyle> = {
  'Core Concept': {
    hex: '#38bdf8', // Cyan
    border: 'border-sky-400/30',
    bg: 'bg-sky-500/10',
    text: 'text-sky-300',
    glow: 'rgba(56, 189, 248, 0.4)'
  },
  'Method': {
    hex: '#34d399', // Emerald
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    glow: 'rgba(52, 211, 153, 0.4)'
  },
  'Method / Framework': {
    hex: '#34d399', // Emerald
    border: 'border-emerald-400/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-300',
    glow: 'rgba(52, 211, 153, 0.4)'
  },
  'Tool': {
    hex: '#a78bfa', // Violet
    border: 'border-violet-400/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    glow: 'rgba(167, 139, 250, 0.4)'
  },
  'Tool / Entity': {
    hex: '#a78bfa', // Violet
    border: 'border-violet-400/30',
    bg: 'bg-violet-500/10',
    text: 'text-violet-300',
    glow: 'rgba(167, 139, 250, 0.4)'
  },
  'Key Insight': {
    hex: '#f59e0b', // Amber
    border: 'border-amber-400/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-300',
    glow: 'rgba(245, 158, 11, 0.4)'
  },
  'Warning': {
    hex: '#f43f5e', // Rose
    border: 'border-rose-400/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
  'Critical Warning / Debate': {
    hex: '#f43f5e', // Rose
    border: 'border-rose-400/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-300',
    glow: 'rgba(244, 63, 94, 0.4)'
  },
};

export function getCategoryStyle(category: string): CategoryStyle {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  const lower = category.toLowerCase();
  if (lower.includes('concept')) return CATEGORY_COLORS['Core Concept'];
  if (lower.includes('method') || lower.includes('framework')) return CATEGORY_COLORS['Method'];
  if (lower.includes('tool') || lower.includes('entity')) return CATEGORY_COLORS['Tool'];
  if (lower.includes('insight')) return CATEGORY_COLORS['Key Insight'];
  if (lower.includes('warn') || lower.includes('debate')) return CATEGORY_COLORS['Warning'];
  
  return CATEGORY_COLORS['Core Concept'];
}

export function getCategoryColor(category: string): string {
  return getCategoryStyle(category).hex;
}
