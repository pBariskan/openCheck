# Project Overview
`grammarly-oss` is a local, offline, open-source grammar and style improvement tool.

## Architecture
The system architecture has two layers:
1. **MANUAL LAYER** (build first): User pastes text into a local web UI, clicks "Improve", Phi-3 Mini model returns multiple suggestions (grammar fix, formal tone, casual tone, rewrite). FastAPI server on localhost:8000.
2. **AUTO LAYER** (build later): Real-time grammar checking while typing in any webpage, using a lightweight FLAN-T5-Large model.

## Tech Stack
- **Language Models**: 
  - `LanguageTool` (Rule-based Python engine for 0.05s instant grammar checks without AI logic)
  - `microsoft/Phi-3-mini-4k-instruct-gguf` Q4 Quantized via `llama.cpp` (hardware-accelerated locally via Apple Metal GPU for blazing fast tone-rewrites).
  - FLAN-T5-Large (later for browser integration)
- **Backend API**: Python 3.11+, FastAPI, Uvicorn (localhost:8000), StreamingResponses (SSE architecture).
- **Frontend**: Plain HTML/CSS/JS (no frameworks) with dynamic JS Fetch Streams for word-by-word UI typing updates.
- **Extensions**: Chrome Extension MV3 (later), macOS Swift layer (later)

## Component Connections
- UI → `POST /stream-improve` → FastAPI → Streams Text Chunks 
- The `/stream-improve` endpoint accepts: `{"text": "...", "mode": "grammar"|"formal"|"casual"|"rewrite"}`

## Coding Conventions
- **Python**: Use `black` syntax formatting and type hints.
- **JavaScript**: Use ES modules, no frameworks.

## How to Run Locally
*(To be detailed as implementation progresses)*
