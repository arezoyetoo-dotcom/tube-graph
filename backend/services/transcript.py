import json
import logging
import re
import urllib.request
from typing import List, Optional
from fastapi import HTTPException
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
    InvalidVideoId,
    VideoUnavailable,
    YouTubeTranscriptApiException,
)

logger = logging.getLogger(__name__)

# Sample transcripts for fallback/offline demonstration
SAMPLE_TRANSCRIPTS = {
    "wjZofJX0v4U": [
        {"text": "Attention in transformers, visually explained.", "start": 0.0, "duration": 5.0},
        {"text": "The core innovation of the transformer architecture is self-attention.", "start": 30.0, "duration": 8.0},
        {"text": "Words are mapped into high-dimensional vector spaces known as word embeddings.", "start": 90.0, "duration": 10.0},
        {"text": "Positional encodings are added so the network recognizes word order.", "start": 160.0, "duration": 10.0},
        {"text": "Each word produces query, key, and value vectors.", "start": 240.0, "duration": 12.0},
        {"text": "Dot products between query and key vectors compute raw attention scores.", "start": 320.0, "duration": 10.0},
        {"text": "We divide by the square root of the dimension and apply softmax scaling.", "start": 410.0, "duration": 10.0},
        {"text": "Multi-head attention allows the model to attend to multiple semantic relationships in parallel.", "start": 520.0, "duration": 12.0},
        {"text": "Residual connections preserve gradient flow across deep transformer layers.", "start": 640.0, "duration": 10.0},
        {"text": "Layer normalization stabilizes internal activations throughout the network.", "start": 750.0, "duration": 10.0},
        {"text": "Feed-forward neural networks process each token position independently.", "start": 870.0, "duration": 10.0},
        {"text": "The quadratic complexity of full self-attention poses computational limits for long context.", "start": 1020.0, "duration": 15.0},
    ],
    "kCc8FmEb1nY": [
        {"text": "Let's build GPT from scratch, in code, spelled out.", "start": 0.0, "duration": 10.0},
        {"text": "We start with a simple character-level bigram language model.", "start": 120.0, "duration": 15.0},
        {"text": "Tokenization converts text strings into discrete integers according to a vocabulary.", "start": 300.0, "duration": 15.0},
        {"text": "Tensors are batched for parallel computation on the GPU.", "start": 480.0, "duration": 15.0},
        {"text": "Self-attention computes affinity matrices between keys and queries.", "start": 900.0, "duration": 20.0},
        {"text": "Masked multi-head attention ensures causal language modeling where tokens cannot peek into the future.", "start": 1400.0, "duration": 20.0},
        {"text": "Residual connections provide highway gradients to train deeper stacks.", "start": 1900.0, "duration": 20.0},
        {"text": "LayerNorm is applied before transformations in the modern pre-LN Transformer variant.", "start": 2400.0, "duration": 20.0},
        {"text": "Cross-entropy loss measures the prediction error against target tokens.", "start": 3100.0, "duration": 20.0},
        {"text": "AdamW optimizer adjusts model weights via decoupled weight decay.", "start": 3800.0, "duration": 20.0},
        {"text": "Autoregressive generation samples tokens sequentially using temperature and top-k.", "start": 4600.0, "duration": 20.0},
    ],
    "dQw4w9WgXcQ": [
        {"text": "We're no strangers to love, you know the rules and so do I.", "start": 18.0, "duration": 6.0},
        {"text": "A full commitment's what I'm thinking of, you wouldn't get this from any other guy.", "start": 27.0, "duration": 8.0},
        {"text": "I just wanna tell you how I'm feeling, gotta make you understand.", "start": 35.0, "duration": 7.0},
        {"text": "Never gonna give you up, never gonna let you down.", "start": 43.0, "duration": 5.0},
        {"text": "Never gonna run around and desert you.", "start": 48.0, "duration": 4.0},
        {"text": "Never gonna make you cry, never gonna say goodbye.", "start": 52.0, "duration": 5.0},
        {"text": "Never gonna tell a lie and hurt you.", "start": 57.0, "duration": 4.0},
        {"text": "We've known each other for so long, your heart's been aching but you're too shy to say it.", "start": 61.0, "duration": 8.0},
        {"text": "Inside we both know what's been going on, we know the game and we're gonna play it.", "start": 70.0, "duration": 8.0},
    ],
}

KNOWN_METADATA = {
    "wjZofJX0v4U": {
        "title": "Attention in transformers, visually explained | Chapter 5, Deep Learning",
        "channel": "3Blue1Brown",
    },
    "kCc8FmEb1nY": {
        "title": "Let's build GPT: from scratch, in code, spelled out.",
        "channel": "Andrej Karpathy",
    },
    "dQw4w9WgXcQ": {
        "title": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        "channel": "Rick Astley",
    },
}

YOUTUBE_URL_PATTERNS = [
    r"(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtu\.be\/([a-zA-Z0-9_-]{11})",
    r"(?:https?:\/\/)?(?:www\.|m\.|music\.)?youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})",
    r"^[a-zA-Z0-9_-]{11}$",
]


def extract_youtube_id(url: Optional[str]) -> Optional[str]:
    """Extract standard 11-character YouTube video ID from various URL formats."""
    if not url:
        return None
    url = url.strip()
    for pattern in YOUTUBE_URL_PATTERNS:
        match = re.search(pattern, url)
        if match:
            return match.group(1) if match.groups() else match.group(0)
    return None


def format_timestamp(seconds: float) -> str:
    """Format seconds into MM:SS or HH:MM:SS string."""
    if seconds is None or seconds < 0:
        return "00:00"
    total_seconds = int(seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def get_video_metadata(video_id: str) -> dict:
    """Fetch video title and channel name via YouTube oEmbed with fallback."""
    if video_id in KNOWN_METADATA:
        return KNOWN_METADATA[video_id]

    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    try:
        req = urllib.request.Request(oembed_url, headers={"User-Agent": "TubeGraph/1.0"})
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode("utf-8"))
            return {
                "title": data.get("title", f"YouTube Video {video_id}"),
                "channel": data.get("author_name", "YouTube Channel"),
            }
    except Exception as err:
        logger.warning(f"Could not fetch oEmbed metadata for {video_id}: {err}")
        return {
            "title": f"YouTube Video {video_id}",
            "channel": "YouTube Channel",
        }


def fetch_transcript(video_id: str) -> List[dict]:
    """
    Fetch timestamped transcript snippets for a YouTube video ID.
    Returns a list of dicts: [{'text': str, 'start': float, 'duration': float}].
    Raises HTTPException(400) if transcript cannot be retrieved.
    """
    try:
        if "get_transcript" in YouTubeTranscriptApi.__dict__:
            raw = YouTubeTranscriptApi.get_transcript(video_id)
            return [
                {
                    "text": item.get("text", "").strip(),
                    "start": float(item.get("start", 0.0)),
                    "duration": float(item.get("duration", 0.0)),
                }
                for item in raw
            ]

        # Modern youtube-transcript-api
        ytt = YouTubeTranscriptApi()
        transcript_obj = ytt.fetch(video_id)
        if hasattr(transcript_obj, "to_raw_data"):
            raw = transcript_obj.to_raw_data()
            return [
                {
                    "text": item.get("text", "").strip(),
                    "start": float(item.get("start", 0.0)),
                    "duration": float(item.get("duration", 0.0)),
                }
                for item in raw
            ]
        else:
            return [
                {
                    "text": getattr(s, "text", "").strip(),
                    "start": float(getattr(s, "start", 0.0)),
                    "duration": float(getattr(s, "duration", 0.0)),
                }
                for s in transcript_obj
            ]
    except (TranscriptsDisabled, NoTranscriptFound, InvalidVideoId, VideoUnavailable, YouTubeTranscriptApiException) as exc:
        logger.warning(f"YouTube transcript error for {video_id}: {exc}")
        if video_id in SAMPLE_TRANSCRIPTS:
            return SAMPLE_TRANSCRIPTS[video_id]
        raise HTTPException(
            status_code=400,
            detail=f"Could not retrieve transcript for video '{video_id}': {str(exc)}",
        )
    except Exception as exc:
        logger.warning(f"Unexpected error fetching transcript for {video_id}: {exc}")
        if video_id in SAMPLE_TRANSCRIPTS:
            return SAMPLE_TRANSCRIPTS[video_id]
        raise HTTPException(
            status_code=400,
            detail=f"Could not retrieve transcript for video '{video_id}': {str(exc)}",
        )
