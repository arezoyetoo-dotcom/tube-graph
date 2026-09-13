import os
import re
from datetime import datetime
from typing import List, Optional

try:
    from models import VideoGraphResponse, GraphNode, GraphEdge
except ImportError:
    from backend.models import VideoGraphResponse, GraphNode, GraphEdge


def sanitize_filename(name: str) -> str:
    """
    Sanitizes a string for safe filesystem paths and Obsidian note filenames.
    Replaces Windows/Linux illegal characters (: / \\ | < > * ? ") with clean separators,
    collapses whitespace, and strips problematic punctuation.
    """
    if not name or not isinstance(name, str):
        return "Untitled"

    # Replace colons, slashes, backslashes, and vertical pipes with hyphen separator
    s = re.sub(r"[:/\\|]+", " - ", name)
    # Remove characters illegal in Windows/Linux filesystems
    s = re.sub(r'[<>"?*\x00-\x1f]', "", s)
    # Normalize spaces around hyphens
    s = re.sub(r"\s*-\s*", " - ", s)
    # Collapse multiple consecutive spaces
    s = re.sub(r"\s+", " ", s)
    # Strip leading and trailing whitespace, dots, and hyphens
    s = s.strip(" .-_")

    # Safe length constraint
    if len(s) > 150:
        s = s[:150].rstrip(" .-_")

    return s if s else "Untitled"


def generate_index_markdown(graph: VideoGraphResponse) -> str:
    """
    Generates 00 - Index.md with YAML frontmatter, executive takeaway,
    and a master concept map table linking all concept notes via [[wikilinks]].
    """
    export_date = datetime.now().strftime("%Y-%m-%d")
    title = graph.video_title or f"YouTube Video {graph.video_id}"
    channel = graph.channel or "YouTube"

    safe_yaml_title = title.replace("\\", "\\\\").replace('"', '\\"')
    safe_yaml_channel = channel.replace("\\", "\\\\").replace('"', '\\"')

    lines = [
        "---",
        f'title: "{safe_yaml_title}"',
        f'video_id: "{graph.video_id}"',
        f'channel: "{safe_yaml_channel}"',
        f'date: "{export_date}"',
        "tags: [tubegraph, youtube-summary, knowledge-graph]",
        "---",
        "",
        f"# {title}",
        "",
        "> [!INFO] Video Metadata",
        f"> - **Channel:** {channel}",
        f"> - **Direct Link:** https://www.youtube.com/watch?v={graph.video_id}",
        f"> - **Exported:** {export_date}",
        "",
        "## Executive Takeaway",
        graph.executive_takeaway.strip() if graph.executive_takeaway else "*No executive takeaway provided.*",
        "",
        "## Master Concept Map",
        "",
    ]

    if graph.nodes:
        lines.append("| Concept | Category | Timestamp | Summary |")
        lines.append("| :--- | :--- | :--- | :--- |")
        for node in graph.nodes:
            clean_label = sanitize_filename(node.label)
            wikilink = f"[[{clean_label}]]" if clean_label == node.label else f"[[{clean_label}|{node.label}]]"
            ts_link = f"[{node.timestamp_formatted}](https://www.youtube.com/watch?v={graph.video_id}&t={int(node.timestamp_seconds)}s)"
            clean_summary = node.summary.replace("|", "-").replace("\n", " ").strip()
            lines.append(f"| {wikilink} | {node.category} | {ts_link} | {clean_summary} |")
    else:
        lines.append("*No concepts available for this video.*")

    lines.append("")
    return "\n".join(lines)


def generate_concept_markdown(
    node: GraphNode,
    graph: VideoGraphResponse,
    node_map: dict,
    edges: List[GraphEdge],
) -> str:
    """
    Generates an individual concept note with YAML frontmatter,
    clickable timestamp link, punchy summary/description, key bullet points,
    and outgoing/incoming [[wikilinks]].
    """
    safe_yaml_id = node.id.replace("\\", "\\\\").replace('"', '\\"')
    safe_yaml_label = node.label.replace("\\", "\\\\").replace('"', '\\"')
    safe_yaml_cat = node.category.replace("\\", "\\\\").replace('"', '\\"')

    lines = [
        "---",
        f'id: "{safe_yaml_id}"',
        f'label: "{safe_yaml_label}"',
        f'category: "{safe_yaml_cat}"',
        f'timestamp: "{node.timestamp_formatted}"',
        f'video_id: "{graph.video_id}"',
        "---",
        "",
        f"# {node.label}",
        "",
        f"[▶ Jump to video at {node.timestamp_formatted}](https://www.youtube.com/watch?v={graph.video_id}&t={int(node.timestamp_seconds)}s)",
        "",
        "## Summary",
        node.summary.strip() if node.summary else "*No summary available.*",
        "",
        "## Description",
        node.description.strip() if node.description else "*No description available.*",
        "",
        "## Key Points",
    ]

    if node.key_points:
        for point in node.key_points:
            pt = point.strip()
            if pt.startswith("- "):
                lines.append(pt)
            elif pt.startswith("* "):
                lines.append(f"- {pt[2:]}")
            else:
                lines.append(f"- {pt}")
    else:
        lines.append("- *No specific key points recorded.*")

    lines.append("")
    lines.append("## Connected Concepts")

    connections = []
    seen = set()

    for edge in edges:
        if edge.source == node.id or edge.source == node.label:
            target_node = node_map.get(edge.target)
            target_label = target_node.label if target_node else edge.target
            clean_target = sanitize_filename(target_label)
            wikilink = f"[[{clean_target}]]" if clean_target == target_label else f"[[{clean_target}|{target_label}]]"
            rel = edge.relationship or "connects to"
            item = f"- {wikilink} *({rel})*"
            if item not in seen:
                seen.add(item)
                connections.append(item)
        elif edge.target == node.id or edge.target == node.label:
            source_node = node_map.get(edge.source)
            source_label = source_node.label if source_node else edge.source
            clean_source = sanitize_filename(source_label)
            wikilink = f"[[{clean_source}]]" if clean_source == source_label else f"[[{clean_source}|{source_label}]]"
            rel = edge.relationship or "related to"
            item = f"- {wikilink} *(related via {rel})*"
            if item not in seen:
                seen.add(item)
                connections.append(item)

    if connections:
        lines.extend(connections)
    else:
        lines.append("*No connected concepts identified.*")

    lines.append("")
    lines.append("---")
    lines.append(f"*Index: [[00 - Index|Master Concept Map]] | Video: [{graph.video_title}](https://www.youtube.com/watch?v={graph.video_id})*")
    lines.append("")

    return "\n".join(lines)


def export_graph_to_obsidian(
    graph: VideoGraphResponse,
    vault_base: str = "/mnt/d/py/projects",
) -> dict:
    """
    Exports a VideoGraphResponse to an Obsidian vault directory:
    <vault_base>/TubeGraph-Vault/<Safe-Video-Title>/

    Writes:
    - 00 - Index.md with master concept map table & frontmatter
    - <Concept>.md for every node with bidirectional [[wikilinks]] and timestamp jumps
    """
    if not vault_base:
        vault_base = os.getenv("OBSIDIAN_VAULT_BASE", "/mnt/d/py/projects")

    safe_title = sanitize_filename(graph.video_title or f"Video-{graph.video_id}")
    export_dir = os.path.join(vault_base, "TubeGraph-Vault", safe_title)

    os.makedirs(export_dir, exist_ok=True)

    files_written = []

    # 1. Write 00 - Index.md
    index_md = generate_index_markdown(graph)
    index_path = os.path.join(export_dir, "00 - Index.md")
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(index_md)
    files_written.append("00 - Index.md")

    # Fast node lookup
    node_map = {}
    for n in graph.nodes:
        node_map[n.id] = n
        node_map[n.label] = n

    # 2. Write individual concept notes
    used_filenames = {"00 - Index.md"}
    for node in graph.nodes:
        clean_name = sanitize_filename(node.label)
        base_name = clean_name
        filename = f"{base_name}.md"
        counter = 1
        while filename in used_filenames:
            filename = f"{base_name} ({counter}).md"
            counter += 1
        used_filenames.add(filename)

        note_path = os.path.join(export_dir, filename)
        content = generate_concept_markdown(node, graph, node_map, graph.edges)
        with open(note_path, "w", encoding="utf-8") as f:
            f.write(content)
        files_written.append(filename)

    return {
        "success": True,
        "export_dir": str(export_dir),
        "vault_base": str(vault_base),
        "video_title": graph.video_title,
        "files_written": files_written,
        "files_count": len(files_written),
        "message": f"Successfully exported {len(files_written)} notes to {export_dir}",
    }
