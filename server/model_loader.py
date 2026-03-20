import os
from huggingface_hub import hf_hub_download
from llama_cpp import Llama

# Ultra-fast, highly obedient Llama-3.2 1B Instruct model (Only ~800MB)
REPO_ID = "bartowski/Llama-3.2-1B-Instruct-GGUF"
FILENAME = "Llama-3.2-1B-Instruct-Q4_K_M.gguf"

llm = None

def load_model():
    global llm
    if llm is not None:
        return

    print("Downloading/Locating model weights...")
    # This automatically downloads or fetches highly compressed GGUF from cache
    model_path = hf_hub_download(repo_id=REPO_ID, filename=FILENAME)

    # Step 2: Load the model into memory
    print(f"Loading model into memory (GPU Apple Metal Mode)...")
    llm = Llama(
        model_path=model_path,
        n_gpu_layers=-1, # Hardware acceleration re-enabled!
        n_ctx=4096, # 4K Context Window for Phi-3
        verbose=False # Keep terminal clean
    )
    print("Optimization complete. Model is loaded with blazing fast Metal backend.")

def generate_stream(messages: list):
    if llm is None:
        load_model()
    
    # Use native Chat Completion to automatically handle proper token stops based on the model!
    stream = llm.create_chat_completion(
        messages=messages, 
        max_tokens=612, 
        temperature=0.7, 
        top_p=0.9,
        stream=True
    )
    
    for chunk in stream:
        if 'delta' in chunk['choices'][0] and 'content' in chunk['choices'][0]['delta']:
            yield chunk['choices'][0]['delta']['content']
