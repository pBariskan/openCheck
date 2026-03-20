import language_tool_python
from model_loader import generate_stream

# Initialize grammar tool globally
tool = None

def get_language_tool():
    global tool
    if tool is None:
        # Instantiates a local server-less fast grammar checking engine engine
        tool = language_tool_python.LanguageTool('en-US')
    return tool

def get_system_prompt(mode: str) -> str:
    base = "You are an expert writing assistant. "
    if mode == "formal":
        task = "Rewrite the provided text to be highly formal, professional, and suitable for business communication."
    elif mode == "casual":
        task = "Rewrite the provided text to be casual, friendly, and natural."
    elif mode == "rewrite":
        task = "Rewrite the provided text to improve its flow, clarity, and vocabulary without changing the original meaning."
    else:
        task = "Fix any grammar issues."

    return f"{base}{task} You must output ONLY the rewritten text and stop immediately. Do not provide multiple options. Do not add notes, tags, or conversational labels."

def improve_text_stream(text: str, mode: str):
    # Rule-based Instant Grammar (Bypasses LLM entirely)
    if mode == "grammar":
        lt = get_language_tool()
        corrected = lt.correct(text)
        # Yield the full string instantly
        yield corrected
        return

    # Advanced AI generation for Formal/Casual/Rewrite
    system_prompt = get_system_prompt(mode)
    
    # Construct instruction prompt for Llama 3.2 Chat
    # Instructing small models requires extreme structural isolation.
    messages = [
        {"role": "system", "content": f"{system_prompt}\nCRITICAL: DO NOT act like a chatbot. DO NOT answer or sympathize. ONLY output the rewritten text."},
        {"role": "user", "content": f"Please rewrite the following text according to the system instructions. Output ONLY the rewritten text and nothing else.\n\nTEXT TO REWRITE:\n{text}"}
    ]
    
    # Stream the generator back chunks
    for token in generate_stream(messages):
        yield token
