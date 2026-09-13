import os
import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path so backend modules can be imported directly
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from models import VideoGraphResponse, GraphNode, GraphEdge
from services.obsidian_export import export_graph_to_obsidian, sanitize_filename
from main import app

client = TestClient(app)


def test_sanitize_filename():
    assert sanitize_filename("Attention") == "Attention"
    assert sanitize_filename("Test AI Video") == "Test AI Video"
    assert sanitize_filename("Attention: Is All You Need?") == "Attention - Is All You Need"
    assert sanitize_filename("Model/Architecture | Overview") == "Model - Architecture - Overview"
    assert sanitize_filename("   .Leading and Trailing Dots.   ") == "Leading and Trailing Dots"
    assert sanitize_filename("") == "Untitled"
    assert sanitize_filename("   ") == "Untitled"
    assert sanitize_filename(":::???***") == "Untitled"


def test_export_graph_to_obsidian(tmp_path):
    graph = VideoGraphResponse(
        video_id="test12345",
        video_title="Test AI Video",
        channel="3Blue1Brown",
        nodes=[
            GraphNode(
                id="attention",
                label="Attention",
                category="Core Concept",
                summary="Dynamic weighting mechanism.",
                description="Connects query and key vectors.",
                key_points=["Parallel computing", "O(N^2) complexity"],
                timestamp_seconds=120,
                timestamp_formatted="02:00",
                val=10,
            ),
            GraphNode(
                id="transformer",
                label="Transformer",
                category="Method",
                summary="Seq2seq neural architecture.",
                description="Built with stacked self-attention layers.",
                key_points=["Scales to billions of parameters"],
                timestamp_seconds=60,
                timestamp_formatted="01:00",
                val=12,
            ),
        ],
        edges=[
            GraphEdge(source="transformer", target="attention", relationship="implements", strength=2)
        ],
        executive_takeaway="Transformers revolutionized modern NLP.",
    )

    result = export_graph_to_obsidian(graph, vault_base=str(tmp_path))

    assert result["success"] is True
    export_dir = result["export_dir"]
    assert os.path.exists(export_dir)
    assert os.path.basename(export_dir) == "Test AI Video"
    assert "TubeGraph-Vault" in export_dir

    # 1. Verify 00 - Index.md exists and check its content
    index_path = os.path.join(export_dir, "00 - Index.md")
    assert os.path.exists(index_path)
    with open(index_path, "r", encoding="utf-8") as f:
        index_content = f.read()

    assert "---" in index_content
    assert "title: \"Test AI Video\"" in index_content or "title: 'Test AI Video'" in index_content or "title: Test AI Video" in index_content
    assert "video_id: \"test12345\"" in index_content or "video_id: test12345" in index_content
    assert "channel: \"3Blue1Brown\"" in index_content or "channel: 3Blue1Brown" in index_content
    assert "tags: [tubegraph, youtube-summary, knowledge-graph]" in index_content or "tubegraph" in index_content
    assert "https://www.youtube.com/watch?v=test12345" in index_content
    assert "Executive Takeaway" in index_content
    assert "Transformers revolutionized modern NLP." in index_content
    assert "Master Concept Map" in index_content
    assert "[[Attention]]" in index_content
    assert "[[Transformer]]" in index_content

    # 2. Verify individual concept note: Attention.md
    attention_path = os.path.join(export_dir, "Attention.md")
    assert os.path.exists(attention_path)
    with open(attention_path, "r", encoding="utf-8") as f:
        att_content = f.read()

    assert "id: \"attention\"" in att_content or "id: attention" in att_content
    assert "label: \"Attention\"" in att_content or "label: Attention" in att_content
    assert "category: \"Core Concept\"" in att_content or "category: Core Concept" in att_content
    assert "timestamp: \"02:00\"" in att_content or "timestamp: 02:00" in att_content
    assert "video_id: \"test12345\"" in att_content or "video_id: test12345" in att_content
    assert "[▶ Jump to video at 02:00](https://www.youtube.com/watch?v=test12345&t=120s)" in att_content
    assert "Dynamic weighting mechanism." in att_content
    assert "Connects query and key vectors." in att_content
    assert "Parallel computing" in att_content
    assert "O(N^2) complexity" in att_content

    # 3. Verify individual concept note: Transformer.md & wikilink
    transformer_path = os.path.join(export_dir, "Transformer.md")
    assert os.path.exists(transformer_path)
    with open(transformer_path, "r", encoding="utf-8") as f:
        trans_content = f.read()

    assert "[▶ Jump to video at 01:00](https://www.youtube.com/watch?v=test12345&t=60s)" in trans_content
    assert "[[Attention]]" in trans_content
    assert "implements" in trans_content


def test_export_graph_with_special_characters(tmp_path):
    graph = VideoGraphResponse(
        video_id="special_id",
        video_title="What is AI? A Deep Dive: Part 1 / Overview",
        channel="AI / Science Channel?",
        nodes=[
            GraphNode(
                id="deep-learning",
                label="Deep Learning: Backprop?",
                category="Core Concept",
                summary="Neural network training algorithm.",
                description="Optimizes weights using gradient descent.",
                key_points=["Backpropagation", "Loss optimization"],
                timestamp_seconds=30,
                timestamp_formatted="00:30",
            )
        ],
        edges=[],
        executive_takeaway="Comprehensive overview of modern deep learning fundamentals.",
    )

    result = export_graph_to_obsidian(graph, vault_base=str(tmp_path))
    assert result["success"] is True
    assert os.path.exists(result["export_dir"])
    assert "What is AI A Deep Dive - Part 1 - Overview" in result["export_dir"]
    node_file = os.path.join(result["export_dir"], "Deep Learning - Backprop.md")
    assert os.path.exists(node_file)


def test_export_graph_empty(tmp_path):
    graph = VideoGraphResponse(
        video_id="empty_id",
        video_title="Empty Graph Video",
        nodes=[],
        edges=[],
        executive_takeaway="No takeaways available.",
    )

    result = export_graph_to_obsidian(graph, vault_base=str(tmp_path))
    assert result["success"] is True
    assert os.path.exists(os.path.join(result["export_dir"], "00 - Index.md"))


def test_api_export_obsidian_endpoint(tmp_path):
    payload = {
        "video_id": "api_test",
        "video_title": "API Export Test Video",
        "channel": "Test Channel",
        "duration_formatted": "05:00",
        "nodes": [
            {
                "id": "concept-1",
                "label": "Concept One",
                "category": "Tool",
                "summary": "First tool summary.",
                "description": "First tool description.",
                "key_points": ["Point A", "Point B"],
                "timestamp_seconds": 90,
                "timestamp_formatted": "01:30",
                "val": 8,
            }
        ],
        "edges": [],
        "executive_takeaway": "Takeaway from API test.",
    }

    # Pass vault_base as query parameter to target tmp_path
    response = client.post(f"/api/export-obsidian?vault_base={tmp_path}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "export_dir" in data
    assert os.path.exists(data["export_dir"])
    assert os.path.exists(os.path.join(data["export_dir"], "00 - Index.md"))
    assert os.path.exists(os.path.join(data["export_dir"], "Concept One.md"))


def test_bidirectional_wikilinks(tmp_path):
    graph = VideoGraphResponse(
        video_id="bidir_test",
        video_title="Bidirectional Links Test",
        nodes=[
            GraphNode(
                id="source-node",
                label="Encoder",
                category="Core Concept",
                summary="Processes input tokens into contextual representations.",
                description="Consists of multiple self-attention layers.",
                key_points=["Processes input"],
                timestamp_seconds=10,
                timestamp_formatted="00:10",
            ),
            GraphNode(
                id="target-node",
                label="Decoder",
                category="Core Concept",
                summary="Generates output tokens auto-regressively.",
                description="Uses masked attention and cross-attention.",
                key_points=["Generates output"],
                timestamp_seconds=20,
                timestamp_formatted="00:20",
            ),
        ],
        edges=[
            GraphEdge(source="source-node", target="target-node", relationship="passes representations to", strength=2)
        ],
        executive_takeaway="Encoder-decoder architecture.",
    )

    result = export_graph_to_obsidian(graph, vault_base=str(tmp_path))
    assert result["success"] is True

    # Encoder.md should link to Decoder
    with open(os.path.join(result["export_dir"], "Encoder.md"), "r", encoding="utf-8") as f:
        encoder_content = f.read()
        assert "[[Decoder]]" in encoder_content
        assert "passes representations to" in encoder_content

    # Decoder.md should link back to Encoder
    with open(os.path.join(result["export_dir"], "Decoder.md"), "r", encoding="utf-8") as f:
        decoder_content = f.read()
        assert "[[Encoder]]" in decoder_content


def test_filename_collision_handling(tmp_path):
    graph = VideoGraphResponse(
        video_id="collision_test",
        video_title="Collision Test",
        nodes=[
            GraphNode(
                id="node-1",
                label="Attention / Layer",
                category="Core Concept",
                summary="First variant.",
                description="Desc 1.",
                timestamp_seconds=0,
                timestamp_formatted="00:00",
            ),
            GraphNode(
                id="node-2",
                label="Attention: Layer?",
                category="Core Concept",
                summary="Second variant with same sanitized base name.",
                description="Desc 2.",
                timestamp_seconds=10,
                timestamp_formatted="00:10",
            ),
        ],
        edges=[],
        executive_takeaway="Disambiguation test.",
    )

    result = export_graph_to_obsidian(graph, vault_base=str(tmp_path))
    assert result["success"] is True
    # Both notes should be created without overwriting each other
    assert len(result["files_written"]) == 3  # 00 - Index.md + 2 notes
    assert os.path.exists(os.path.join(result["export_dir"], "Attention - Layer.md"))
    assert os.path.exists(os.path.join(result["export_dir"], "Attention - Layer (1).md"))


def test_api_export_obsidian_with_vault_base_in_body(tmp_path):
    custom_vault = str(tmp_path / "custom_vault")
    payload = {
        "video_id": "body_vault_test",
        "video_title": "Body Vault Test",
        "vault_base": custom_vault,
        "nodes": [],
        "edges": [],
        "executive_takeaway": "Testing vault_base in JSON body.",
    }

    response = client.post("/api/export-obsidian", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert custom_vault in data["export_dir"]
    assert os.path.exists(os.path.join(data["export_dir"], "00 - Index.md"))
