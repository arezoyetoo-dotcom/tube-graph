import logging
import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Flexible import resolution supporting both direct and module-prefixed execution
try:
    from models import VideoGraphResponse, AnalyzeRequest, GraphNode, GraphEdge
    from services.transcript import extract_youtube_id, fetch_transcript, get_video_metadata, format_timestamp
    from services.ai_graph import generate_graph_from_transcript
    from services.obsidian_export import export_graph_to_obsidian, sanitize_filename
except ImportError:
    from backend.models import VideoGraphResponse, AnalyzeRequest, GraphNode, GraphEdge
    from backend.services.transcript import extract_youtube_id, fetch_transcript, get_video_metadata, format_timestamp
    from backend.services.ai_graph import generate_graph_from_transcript
    from backend.services.obsidian_export import export_graph_to_obsidian, sanitize_filename

logger = logging.getLogger("tubegraph")

app = FastAPI(title="TubeGraph API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "tube-graph-api"}


@app.post("/api/analyze", response_model=VideoGraphResponse)
def analyze(request: AnalyzeRequest):
    """
    Analyzes a YouTube video URL: extracts its transcript, queries Gemini for structured
    concept nodes and relationships, and returns an Obsidian-style knowledge graph.
    """
    video_id = extract_youtube_id(request.url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid watch, embed, or shorts link.",
        )

    # Fetch video metadata (title, channel) with oEmbed fallback
    metadata = get_video_metadata(video_id)
    video_title = metadata.get("title", f"YouTube Video {video_id}")
    channel = metadata.get("channel", "YouTube")

    # Fetch transcript with graceful exception handling
    transcript = fetch_transcript(video_id)

    # Synthesize knowledge graph using Gemini (or intelligent fallback)
    graph = generate_graph_from_transcript(
        video_id=video_id,
        video_title=video_title,
        transcript=transcript,
    )

    # Ensure channel and title metadata are populated
    if not graph.channel and channel:
        graph.channel = channel
    if not graph.video_title or graph.video_title.startswith("YouTube Video") and video_title:
        graph.video_title = video_title

    return graph


@app.post("/api/export-obsidian")
def export_obsidian(
    graph: VideoGraphResponse,
    vault_base: Optional[str] = None,
):
    """
    Exports a VideoGraphResponse directly into an Obsidian vault with
    bidirectional [[wikilinks]], YAML frontmatter, and timestamp links.
    """
    target_vault = vault_base or graph.vault_base or os.getenv("OBSIDIAN_VAULT_BASE", "/mnt/d/py/projects")
    try:
        result = export_graph_to_obsidian(graph, vault_base=target_vault)
        return result
    except Exception as e:
        logger.error(f"Failed to export graph to Obsidian: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export Obsidian notes: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5417, reload=True)
