from typing import List, Optional
from pydantic import BaseModel, Field


class GraphNode(BaseModel):
    id: str
    label: str
    category: str  # Core Concept, Tool, Method, Key Insight, Warning
    summary: str  # 1 sentence crisp definition
    description: str  # 2-3 sentences max, simple and punchy
    key_points: List[str] = Field(default_factory=list)  # 2-3 bullet points
    timestamp_seconds: int = 0
    timestamp_formatted: str = "00:00"
    val: int = 8  # Node radius weight


class GraphEdge(BaseModel):
    source: str
    target: str
    relationship: str
    strength: int = 1


class VideoGraphResponse(BaseModel):
    video_id: str
    video_title: str
    channel: str = ""
    duration_formatted: str = ""
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    executive_takeaway: str = ""


class AnalyzeRequest(BaseModel):
    url: str
