import sys
from pathlib import Path

# Add backend directory to sys.path so backend modules can be imported directly
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
import pytest
from main import app
from models import GraphNode, GraphEdge, VideoGraphResponse, AnalyzeRequest

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "tube-graph-api"

def test_cors_headers():
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5416",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") in ["*", "http://localhost:5416"]

def test_analyze_stub_endpoint():
    payload = {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}
    response = client.post("/api/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "video_id" in data
    assert "video_title" in data
    assert "nodes" in data
    assert "edges" in data
    assert "executive_takeaway" in data

def test_models_instantiation():
    node = GraphNode(
        id="node-1",
        label="Test Node",
        category="Core Concept",
        summary="Short summary.",
        description="A clear description.",
        key_points=["Point 1", "Point 2"],
        timestamp_seconds=125,
        timestamp_formatted="02:05",
        val=10
    )
    assert node.id == "node-1"
    assert node.val == 10
    assert len(node.key_points) == 2

    edge = GraphEdge(
        source="node-1",
        target="node-2",
        relationship="connects",
        strength=2
    )
    assert edge.source == "node-1"
    assert edge.strength == 2

    response = VideoGraphResponse(
        video_id="dQw4w9WgXcQ",
        video_title="Sample Title",
        channel="Test Channel",
        duration_formatted="03:33",
        nodes=[node],
        edges=[edge],
        executive_takeaway="Key takeaway here."
    )
    assert response.video_id == "dQw4w9WgXcQ"
    assert len(response.nodes) == 1
    assert len(response.edges) == 1

    req = AnalyzeRequest(url="https://youtu.be/dQw4w9WgXcQ")
    assert req.url == "https://youtu.be/dQw4w9WgXcQ"
