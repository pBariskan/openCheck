import os
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

# Heavily quantized, ultra-fast generic GGUF version of Phi-3 Mini
REPO_ID = "microsoft/Phi-3-mini-4k-instruct-gguf"
FILENAME = "Phi-3-mini-4k-instruct-q4.gguf" # We use Q4 for optimized memory and speed

llm = None

def load_model():
    global llm
    if llm is not None:
        return

    print("Downloading/Locating model weights...")
    # This automatically downloads or fetches highly compressed GGUF from cache
    model_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)

    # Step 2: Load the model into memory
    # Temporarily disabling GPU (n_gpu_layers=0) to test if the Metal Framework is causing the segfault
    print(f"Loading model into memory (CPU Only Mode)...")
    llm = Llama(
        model_path=model_path,
        n_gpu_layers=0, # Fallback to CPU to bypass Apple Metal GPU bugs
        n_ctx=4096, # 4K Context Window for Phi-3
        verbose=False # Keep terminal clean
    )
    print("Optimization complete. Model loaded for CPU inference.")

def generate_stream(prompt: str):
    if llm is None:
        load_model()
    
    # Yield tokens one by one as they generate
    stream = llm.create_completion(
        prompt, 
        max_tokens=612, 
        temperature=0.7, 
        top_p=0.9,
        stream=True
    )
    
    for output in stream:
        yield output['choices'][0]['text']
