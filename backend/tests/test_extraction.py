import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from services.transcript import extract_youtube_id, fetch_transcript, format_timestamp
from services.ai_graph import generate_graph_from_transcript
from models import VideoGraphResponse, GraphNode, GraphEdge
from main import app

client = TestClient(app)


def test_extract_youtube_id_various_formats():
    assert extract_youtube_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://youtu.be/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://www.youtube.com/embed/dQw4w9WgXcQ?si=123") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://www.youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30s") == "dQw4w9WgXcQ"
    assert extract_youtube_id("https://music.youtube.com/watch?v=dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("   dQw4w9WgXcQ   ") == "dQw4w9WgXcQ"
    assert extract_youtube_id("invalid-link") is None
    assert extract_youtube_id("https://google.com") is None
    assert extract_youtube_id("") is None
    assert extract_youtube_id(None) is None


def test_format_timestamp():
    assert format_timestamp(0) == "00:00"
    assert format_timestamp(45) == "00:45"
    assert format_timestamp(125.0) == "02:05"
    assert format_timestamp(3600) == "01:00:00"
    assert format_timestamp(3725.4) == "01:02:05"
    assert format_timestamp(-5) == "00:00"


def test_fetch_transcript_success():
    sample_raw = [
        {"text": "Hello world", "start": 0.0, "duration": 2.5},
        {"text": "In this video we talk about transformers", "start": 3.0, "duration": 4.0},
    ]

    mock_snippet_1 = MagicMock(text="Hello world", start=0.0, duration=2.5)
    mock_snippet_2 = MagicMock(text="In this video we talk about transformers", start=3.0, duration=4.0)
    mock_fetched = MagicMock()
    mock_fetched.to_raw_data.return_value = sample_raw
    mock_fetched.__iter__.return_value = iter([mock_snippet_1, mock_snippet_2])

    with patch("services.transcript.YouTubeTranscriptApi") as mock_ytt:
        instance = mock_ytt.return_value
        instance.fetch.return_value = mock_fetched

        result = fetch_transcript("dQw4w9WgXcQ")
        assert len(result) == 2
        assert result[0]["text"] == "Hello world"
        assert result[0]["start"] == 0.0


def test_fetch_transcript_error_handling():
    with patch("services.transcript.YouTubeTranscriptApi") as mock_ytt:
        from youtube_transcript_api import TranscriptsDisabled
        instance = mock_ytt.return_value
        instance.fetch.side_effect = TranscriptsDisabled("dQw4w9WgXcQ")

        with pytest.raises(HTTPException) as exc_info:
            fetch_transcript("unknown_video_without_sample")
        assert exc_info.value.status_code == 400
        assert "transcript" in exc_info.value.detail.lower()


def test_generate_graph_fallback():
    mock_transcript = [
        {"text": "Introduction to attention mechanism", "start": 10.0, "duration": 5.0},
        {"text": "Self-attention computes dot products between query and key vectors", "start": 60.0, "duration": 10.0},
        {"text": "Feed forward networks process each position independently", "start": 120.0, "duration": 10.0},
        {"text": "Positional encodings provide order information to the model", "start": 180.0, "duration": 10.0},
    ]

    # Calling with empty API key should trigger deterministic fallback
    with patch.dict("os.environ", {}, clear=True):
        graph = generate_graph_from_transcript("wjZofJX0v4U", "Attention in transformers", mock_transcript)
        assert isinstance(graph, VideoGraphResponse)
        assert graph.video_id == "wjZofJX0v4U"
        assert len(graph.nodes) >= 8
        assert len(graph.edges) >= 8
        assert len(graph.executive_takeaway) > 10

        # Verify node constraints
        for node in graph.nodes:
            assert isinstance(node, GraphNode)
            assert len(node.id) > 0
            assert len(node.label) > 0
            assert node.category in ["Core Concept", "Method", "Tool", "Key Insight", "Warning"]
            assert len(node.summary) > 0
            # Simple & punchy description (no essay)
            assert len(node.description) > 0
            assert len(node.description) < 300
            # 2-3 bullet points
            assert 1 <= len(node.key_points) <= 4
            assert node.timestamp_seconds >= 0
            assert ":" in node.timestamp_formatted

        # Verify edges connect valid nodes
        node_ids = {n.id for n in graph.nodes}
        for edge in graph.edges:
            assert isinstance(edge, GraphEdge)
            assert edge.source in node_ids
            assert edge.target in node_ids
            assert len(edge.relationship) > 0


def test_generate_graph_mocked_gemini():
    mock_transcript = [{"text": "Hello", "start": 0.0, "duration": 2.0}]

    mock_llm_output = {
        "video_title": "Gemini Generated Graph",
        "executive_takeaway": "A concise executive takeaway of the video.",
        "nodes": [
            {
                "id": "node-a",
                "label": "Node A",
                "category": "Core Concept",
                "summary": "Core concept summary.",
                "description": "Simple punchy description.",
                "key_points": ["Point 1", "Point 2"],
                "timestamp_seconds": 15,
                "timestamp_formatted": "00:15",
                "val": 10
            },
            {
                "id": "node-b",
                "label": "Node B",
                "category": "Method",
                "summary": "Method summary.",
                "description": "Another punchy description.",
                "key_points": ["Point 3", "Point 4"],
                "timestamp_seconds": 45,
                "timestamp_formatted": "00:45",
                "val": 8
            }
        ],
        "edges": [
            {
                "source": "node-a",
                "target": "node-b",
                "relationship": "triggers",
                "strength": 2
            }
        ]
    }

    import json
    mock_response = MagicMock()
    mock_response.text = json.dumps(mock_llm_output)

    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake-key"}):
        with patch("services.ai_graph.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client_cls.return_value = mock_client
            mock_client.models.generate_content.return_value = mock_response

            graph = generate_graph_from_transcript("test12345", "Test Title", mock_transcript)
            assert graph.video_id == "test12345"
            assert graph.video_title == "Gemini Generated Graph"
            assert len(graph.nodes) == 2
            assert graph.nodes[0].id == "node-a"
            assert len(graph.edges) == 1
            assert graph.edges[0].relationship == "triggers"


def test_api_analyze_valid_url():
    response = client.post("/api/analyze", json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"})
    assert response.status_code == 200
    data = response.json()
    assert data["video_id"] == "dQw4w9WgXcQ"
    assert len(data["nodes"]) >= 8
    assert len(data["edges"]) >= 8


def test_api_analyze_invalid_url():
    response = client.post("/api/analyze", json={"url": "invalid-url-here"})
    assert response.status_code == 400
    assert "detail" in response.json()


def test_karpathy_fallback():
    with patch.dict("os.environ", {}, clear=True):
        graph = generate_graph_from_transcript("kCc8FmEb1nY", "Let's build GPT", [])
        assert graph.video_id == "kCc8FmEb1nY"
        assert len(graph.nodes) == 10
        assert len(graph.edges) == 9
        assert any(n.id == "causal-masking" for n in graph.nodes)


def test_generate_graph_signature_flexibility():
    mock_transcript = [{"text": "Sample topic", "start": 0.0, "duration": 5.0}]
    with patch.dict("os.environ", {}, clear=True):
        # Call with 2 args: (video_id, transcript)
        graph = generate_graph_from_transcript("sample_id", mock_transcript)
        assert graph.video_id == "sample_id"
        assert len(graph.nodes) >= 1


def test_get_video_metadata():
    from services.transcript import get_video_metadata

    # Known sample
    meta = get_video_metadata("wjZofJX0v4U")
    assert meta["channel"] == "3Blue1Brown"

    # Fallback when network fails or unknown
    with patch("urllib.request.urlopen", side_effect=Exception("network down")):
        meta_unknown = get_video_metadata("unknown_xyz")
        assert "unknown_xyz" in meta_unknown["title"]
        assert meta_unknown["channel"] == "YouTube Channel"

