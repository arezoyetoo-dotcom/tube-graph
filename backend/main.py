from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import VideoGraphResponse, AnalyzeRequest

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
    # Stub implementation to be implemented in Task 2
    return VideoGraphResponse(
        video_id="stub",
        video_title="Analysis Stub",
        channel="TubeGraph",
        duration_formatted="00:00",
        nodes=[],
        edges=[],
        executive_takeaway="Analyze endpoint stub initialized. Will be connected to Gemini in Task 2."
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=5417, reload=True)
