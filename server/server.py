from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import uvicorn
import threading

from improver import improve_text_stream

app = FastAPI(title="Grammarly OSS Server (Streaming Edition)")
llm_lock = threading.Lock()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ImproveRequest(BaseModel):
    text: str
    mode: str 

@app.post("/stream-improve")
async def stream_improve_endpoint(req: ImproveRequest):
    valid_modes = {"grammar", "formal", "casual", "rewrite"}
    mode = req.mode if req.mode in valid_modes else "grammar"
    
    if not llm_lock.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="AI is currently busy generating text. Please wait a few seconds.")
    
    def iter_text():
        try:
            # Encode string chunks to bytes to push over ASGI explicitly
            for chunk in improve_text_stream(req.text, mode):
                yield chunk.encode("utf-8")
        finally:
            llm_lock.release()
            
    # Streams raw text dynamically to frontend over HTTP chunking
    return StreamingResponse(iter_text(), media_type="text/plain")

@app.get("/health")
def health_endpoint():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8000, reload=True)
