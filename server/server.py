from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import uvicorn
import threading
import os

from improver import improve_text_stream
from database import init_db, create_profile, list_profiles, get_profile, update_profile_mode, delete_profile, record_stat, get_stats_for_profile

app = FastAPI(title="openCheck Server")
llm_lock = threading.Lock()

# Initialize SQLite tables on startup
init_db()

# ─── Serve the UI from /ui ───
UI_DIR = os.path.join(os.path.dirname(__file__), "..", "ui")
app.mount("/ui", StaticFiles(directory=UI_DIR), name="ui")

@app.get("/", include_in_schema=False)
def serve_index():
    return FileResponse(os.path.join(UI_DIR, "index.html"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────── Models ───────────────

class ImproveRequest(BaseModel):
    text: str
    mode: str
    profile_id: Optional[int] = None  # Optional – stats won't be tracked if None

class CreateProfileRequest(BaseModel):
    name: str
    default_mode: Optional[str] = "grammar"

class UpdateProfileRequest(BaseModel):
    default_mode: str

# ─────────────── Text Improvement ───────────────

@app.post("/stream-improve")
async def stream_improve_endpoint(req: ImproveRequest):
    valid_modes = {"grammar", "formal", "casual", "rewrite"}
    mode = req.mode if req.mode in valid_modes else "grammar"

    if not llm_lock.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="AI is currently busy generating. Please wait a few seconds.")

    input_text = req.text
    profile_id = req.profile_id
    words_written = len(input_text.split())

    def iter_text():
        full_output = []
        try:
            for chunk in improve_text_stream(input_text, mode):
                full_output.append(chunk)
                yield chunk.encode("utf-8")
        finally:
            llm_lock.release()
            # Record stats after streaming completes (only if profile given)
            if profile_id is not None:
                output_text = "".join(full_output)
                # Count word-level differences as a proxy for corrections
                input_words = input_text.split()
                output_words = output_text.split()
                corrections = sum(1 for a, b in zip(input_words, output_words) if a != b)
                corrections += abs(len(input_words) - len(output_words))
                try:
                    record_stat(profile_id, words_written, corrections, mode)
                except Exception:
                    pass  # Never crash the stream over a stats write failure

    return StreamingResponse(iter_text(), media_type="text/plain")


# ─────────────── Profile Endpoints ───────────────

@app.get("/api/profiles")
def get_profiles():
    return list_profiles()

@app.post("/api/profiles", status_code=201)
def post_profile(req: CreateProfileRequest):
    existing = list_profiles()
    names = [p["name"].lower() for p in existing]
    if req.name.strip().lower() in names:
        raise HTTPException(status_code=409, detail="A profile with that name already exists.")
    return create_profile(req.name, req.default_mode or "grammar")

@app.get("/api/profiles/{profile_id}")
def get_profile_endpoint(profile_id: int):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return profile

@app.patch("/api/profiles/{profile_id}")
def patch_profile(profile_id: int, req: UpdateProfileRequest):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    update_profile_mode(profile_id, req.default_mode)
    return get_profile(profile_id)

@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile_endpoint(profile_id: int):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    delete_profile(profile_id)


# ─────────────── Stats Endpoints ───────────────

@app.get("/api/stats/{profile_id}")
def get_stats(profile_id: int):
    profile = get_profile(profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found.")
    return get_stats_for_profile(profile_id)


# ─────────────── Health ───────────────

@app.get("/health")
def health_endpoint():
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
