document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const improveBtn = document.getElementById('improve-btn');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('loading-spinner');
    const modeButtons = document.querySelectorAll('.mode-btn');
    const outputModeBadge = document.getElementById('output-mode-badge');
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    let currentMode = 'grammar';
    let isProcessing = false;

    const SERVER_URL = 'http://localhost:8000';

    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentMode = e.target.getAttribute('data-mode');
            outputModeBadge.textContent = currentMode;
        });
    });

    improveBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text || isProcessing) return;

        setLoadingState(true);

        suggestionsContainer.innerHTML = `
            <div class="suggestion-card" id="streaming-card" style="cursor: default;">
                <p id="streaming-text" style="font-size: 1.1rem; line-height: 1.6;"></p>
                <div class="copy-icon" id="copy-btn-stream" style="display:none; cursor: pointer; position: absolute; top: 1rem; right: 1rem;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </div>
            </div>
        `;
        
        const textElement = document.getElementById('streaming-text');
        const copyBtn = document.getElementById('copy-btn-stream');

        try {
            const response = await fetch(`${SERVER_URL}/stream-improve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text, mode: currentMode })
            });

            if (!response.ok) throw new Error('Server returned an error.');
            if (!response.body) throw new Error("ReadableStream not supported by browser.");

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let fullText = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                
                // Aggressive Frontend Hallucination Guard
                const cutoffMatch = fullText.match(/\n-?\s*(Response|AI|Output|Rewrite|Here is|Note|Suggestion):?.*$/is);
                if (cutoffMatch) {
                    fullText = fullText.substring(0, cutoffMatch.index);
                    textElement.innerHTML = escapeHTML(fullText).replace(/\n/g, '<br>');
                    break; // Kill the stream reader instantly
                }

                textElement.innerHTML = escapeHTML(fullText).replace(/\n/g, '<br>');
                suggestionsContainer.scrollTop = suggestionsContainer.scrollHeight;
            }

            setLoadingState(false);
            copyBtn.style.display = 'block';

            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(fullText);
                    const origSvg = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<span style="color: var(--accent-primary); font-size: 0.9rem; font-weight: 500;">✓ Copied</span>`;
                    setTimeout(() => { copyBtn.innerHTML = origSvg; }, 1500);
                } catch (err) { }
            });

        } catch (error) {
            console.error("Streaming Error:", error);
            suggestionsContainer.innerHTML = `
                <div class="empty-state">
                    <p style="color: #ff5e5e;">Connection Error. Make sure the FastAPI server is running.</p>
                </div>
            `;
            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        isProcessing = isLoading;
        textInput.disabled = isLoading;
        improveBtn.disabled = isLoading;
        
        if (isLoading) {
            btnText.textContent = "Writing...";
            spinner.classList.remove('hidden');
        } else {
            btnText.textContent = "Improve Text";
            spinner.classList.add('hidden');
        }
    }

    function escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
});
