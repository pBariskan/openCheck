# Server

FastAPI inference server for the `grammarly-oss` manual improvement layer. It loads the `Phi-3-mini-4k-instruct` model and exposes endpoints for grammar and style improvements.

## Setup Instructions

1. **Create and activate a virtual environment:**
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate
   ```

2. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the server:**
   ```bash
   python server.py
   ```
   *(Alternatively, run `uvicorn server:app --host 127.0.0.1 --port 8000 --reload`)*

   The first time you start the server, it will download the Phi-3 model (~3.8 GB) from Hugging Face, so it might take a moment to initialize.

## Endpoints

### Health Check
**GET /health**
```bash
curl http://localhost:8000/health
```

### Improve Text
**POST /improve**
```bash
curl -X POST http://localhost:8000/improve \
     -H "Content-Type: application/json" \
     -d '{"text": "this sentence are not good.", "mode": "grammar"}'
```

**Modes available:** `grammar`, `formal`, `casual`, `rewrite`
