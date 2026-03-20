document.addEventListener('DOMContentLoaded', () => {
    // Relative URLs — FastAPI serves the UI at http://localhost:8000
    const SERVER_URL = '';

    // ── DOM refs ──
    const textInput          = document.getElementById('text-input');
    const improveBtn         = document.getElementById('improve-btn');
    const btnText            = document.getElementById('btn-text');
    const spinner            = document.getElementById('loading-spinner');
    const modeItems          = document.querySelectorAll('.mode-item');
    const outputModeBadge    = document.getElementById('output-mode-badge');
    const suggestionsContainer = document.getElementById('suggestions-container');
    const wordCountBadge     = document.getElementById('word-count-badge');

    // Profile overlay
    const profileOverlay     = document.getElementById('profile-overlay');
    const profileList        = document.getElementById('profile-list');
    const modalDivider       = document.getElementById('modal-divider');
    const showCreateBtn      = document.getElementById('show-create-profile-btn');
    const createForm         = document.getElementById('create-profile-form');
    const newProfileName     = document.getElementById('new-profile-name');
    const cancelCreateBtn    = document.getElementById('cancel-create-btn');
    const confirmCreateBtn   = document.getElementById('confirm-create-btn');
    const profileErrorEl     = document.getElementById('profile-error');

    // Sidebar profile
    const sidebarProfile     = document.getElementById('sidebar-profile');
    const spAvatar           = document.getElementById('sp-avatar');
    const spName             = document.getElementById('sp-name');
    const spMenuBtn          = document.getElementById('sp-menu-btn');
    const spDropdown         = document.getElementById('sp-dropdown');
    const viewStatsBtn       = document.getElementById('view-stats-btn');
    const switchProfileBtn   = document.getElementById('switch-profile-btn');

    // Stats modal
    const statsOverlay       = document.getElementById('stats-overlay');
    const closeStatsBtn      = document.getElementById('close-stats-btn');
    const statsAvatar        = document.getElementById('stats-avatar');
    const statsProfileName   = document.getElementById('stats-profile-name');
    const statTotalWords     = document.getElementById('stat-total-words');
    const statSessions       = document.getElementById('stat-sessions');
    const statCorrections    = document.getElementById('stat-corrections');
    const statImprovement    = document.getElementById('stat-improvement');
    const deleteProfileBtn   = document.getElementById('delete-profile-btn');

    // ── State ──
    let currentMode     = 'grammar';
    let isProcessing    = false;
    let currentProfile  = null;

    // ═══════════════════════════════════════════════════
    //  PROFILE SYSTEM
    // ═══════════════════════════════════════════════════

    async function loadProfiles() {
        try {
            const res = await fetch(`${SERVER_URL}/api/profiles`);
            return await res.json();
        } catch {
            return null;
        }
    }

    async function initProfiles() {
        const profiles = await loadProfiles();

        if (profiles === null) {
            profileList.innerHTML = `<p class="error-msg" style="width:100%;text-align:center;">⚠️ Cannot reach the server.<br><small>Is <code>start.sh</code> running?</small></p>`;
            showOverlay(profileOverlay);
            return;
        }

        const savedId = parseInt(localStorage.getItem('activeProfileId'), 10);
        if (savedId && profiles.find(p => p.id === savedId)) {
            selectProfile(profiles.find(p => p.id === savedId));
            return;
        }

        renderProfileList(profiles);
        showOverlay(profileOverlay);
    }

    function renderProfileList(profiles) {
        if (!profiles.length) {
            profileList.innerHTML = '';
            modalDivider && modalDivider.classList.add('hidden');
            return;
        }
        modalDivider && modalDivider.classList.remove('hidden');
        profileList.innerHTML = profiles.map(p => `
            <button class="profile-item-card" data-id="${p.id}" data-name="${escapeAttr(p.name)}" data-mode="${p.default_mode}">
                <div class="pic-avatar">${p.name.charAt(0).toUpperCase()}</div>
                <span>${escapeHTML(p.name)}</span>
            </button>
        `).join('');

        profileList.querySelectorAll('.profile-item-card').forEach(btn => {
            btn.addEventListener('click', () => {
                selectProfile({ id: +btn.dataset.id, name: btn.dataset.name, default_mode: btn.dataset.mode });
            });
        });
    }

    function selectProfile(profile) {
        currentProfile = profile;
        localStorage.setItem('activeProfileId', profile.id);
        if (profile.default_mode && profile.default_mode !== currentMode) setMode(profile.default_mode);
        hideOverlay(profileOverlay);
        updateSidebarProfile(profile);
        createForm.classList.add('hidden');
        showCreateBtn.classList.remove('hidden');
        modalDivider && modalDivider.classList.remove('hidden');
    }

    function updateSidebarProfile(profile) {
        spAvatar.textContent  = profile.name.charAt(0).toUpperCase();
        spName.textContent    = profile.name;
        statsAvatar.textContent = profile.name.charAt(0).toUpperCase();
        sidebarProfile.classList.remove('hidden');
    }

    function showOverlay(el) { el.classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
    function hideOverlay(el) { el.classList.add('hidden'); document.body.style.overflow = ''; }

    // ── Create profile ──
    showCreateBtn.addEventListener('click', () => {
        showCreateBtn.classList.add('hidden');
        modalDivider && modalDivider.classList.add('hidden');
        createForm.classList.remove('hidden');
        newProfileName.focus();
    });

    cancelCreateBtn.addEventListener('click', async () => {
        createForm.classList.add('hidden');
        showCreateBtn.classList.remove('hidden');
        newProfileName.value = '';
        profileErrorEl.classList.add('hidden');
        const profiles = await loadProfiles();
        if (profiles?.length) modalDivider?.classList.remove('hidden');
    });

    confirmCreateBtn.addEventListener('click', doCreate);
    newProfileName.addEventListener('keydown', e => { if (e.key === 'Enter') doCreate(); });

    async function doCreate() {
        const name = newProfileName.value.trim();
        if (!name) { newProfileName.focus(); return; }
        confirmCreateBtn.disabled = true;
        confirmCreateBtn.textContent = 'Creating…';
        try {
            const res = await fetch(`${SERVER_URL}/api/profiles`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, default_mode: currentMode })
            });
            if (res.status === 409) { showError('A profile with that name already exists.'); return; }
            if (!res.ok) throw new Error();
            const profile = await res.json();
            newProfileName.value = '';
            profileErrorEl.classList.add('hidden');
            selectProfile(profile);
        } catch { showError('Could not create profile. Is the server running?'); }
        finally { confirmCreateBtn.disabled = false; confirmCreateBtn.textContent = 'Create Profile'; }
    }

    function showError(msg) {
        profileErrorEl.textContent = msg;
        profileErrorEl.classList.remove('hidden');
        setTimeout(() => profileErrorEl.classList.add('hidden'), 3500);
    }

    // ── Sidebar dropdown ──
    spMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        spDropdown.classList.toggle('hidden');
    });
    document.addEventListener('click', () => spDropdown.classList.add('hidden'));

    viewStatsBtn.addEventListener('click', () => { spDropdown.classList.add('hidden'); openStats(); });
    switchProfileBtn.addEventListener('click', async () => {
        spDropdown.classList.add('hidden');
        localStorage.removeItem('activeProfileId');
        currentProfile = null;
        sidebarProfile.classList.add('hidden');
        const profiles = await loadProfiles();
        if (profiles !== null) renderProfileList(profiles);
        showOverlay(profileOverlay);
    });

    // ═══════════════════════════════════════════════════
    //  STATS MODAL
    // ═══════════════════════════════════════════════════

    async function openStats() {
        if (!currentProfile) return;
        statsProfileName.textContent = currentProfile.name;
        statsAvatar.textContent = currentProfile.name.charAt(0).toUpperCase();
        [statTotalWords, statSessions, statCorrections, statImprovement].forEach(el => el.textContent = '…');
        showOverlay(statsOverlay);

        try {
            const res = await fetch(`${SERVER_URL}/api/stats/${currentProfile.id}`);
            const data = await res.json();
            statTotalWords.textContent  = data.total_words.toLocaleString();
            statSessions.textContent    = data.sessions.toLocaleString();
            statCorrections.textContent = data.total_corrections.toLocaleString();
            statImprovement.textContent = data.improvement_rate + '%';
            drawSparkline(data.daily);
        } catch {
            statTotalWords.textContent = 'N/A';
        }
    }

    closeStatsBtn.addEventListener('click', () => hideOverlay(statsOverlay));
    statsOverlay.addEventListener('click', e => { if (e.target === statsOverlay) hideOverlay(statsOverlay); });

    deleteProfileBtn.addEventListener('click', async () => {
        if (!currentProfile) return;
        if (!confirm(`Delete profile "${currentProfile.name}" and all its stats? This cannot be undone.`)) return;
        await fetch(`${SERVER_URL}/api/profiles/${currentProfile.id}`, { method: 'DELETE' });
        hideOverlay(statsOverlay);
        localStorage.removeItem('activeProfileId');
        currentProfile = null;
        sidebarProfile.classList.add('hidden');
        const profiles = await loadProfiles();
        if (profiles !== null) renderProfileList(profiles);
        showOverlay(profileOverlay);
    });

    // ── Sparkline ──
    function drawSparkline(daily) {
        const canvas = document.getElementById('sparkline-canvas');
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        if (!daily?.length) {
            ctx.fillStyle = '#5c5c78';
            ctx.font = '13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet — start writing!', W / 2, H / 2);
            return;
        }

        const words       = daily.map(d => d.words || 0);
        const corrections = daily.map(d => d.corrections || 0);
        const days        = daily.map(d => d.day);
        const maxVal      = Math.max(...words, ...corrections, 1);
        const n           = daily.length;

        const padL = 8, padR = 8, padT = 12, padB = 24;
        const gW = W - padL - padR, gH = H - padT - padB;

        const xAt = i => padL + (i / Math.max(n - 1, 1)) * gW;
        const yAt = v => padT + gH - (v / maxVal) * gH;

        const drawLine = (data, color, fillColor) => {
            ctx.beginPath();
            ctx.moveTo(xAt(0), yAt(data[0]));
            for (let i = 1; i < data.length; i++) ctx.lineTo(xAt(i), yAt(data[i]));
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.lineTo(xAt(data.length - 1), padT + gH); ctx.lineTo(xAt(0), padT + gH);
            ctx.closePath(); ctx.fillStyle = fillColor; ctx.fill();
            ctx.fillStyle = color;
            data.forEach((v, i) => { ctx.beginPath(); ctx.arc(xAt(i), yAt(v), 3, 0, Math.PI * 2); ctx.fill(); });
        };

        drawLine(words,       '#4776e6', 'rgba(71,118,230,.1)');
        drawLine(corrections, '#7c5bf0', 'rgba(124,91,240,.1)');

        ctx.fillStyle = '#5c5c78'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'center';
        days.forEach((d, i) => ctx.fillText(d.slice(5), xAt(i), H - 5));
    }

    // ═══════════════════════════════════════════════════
    //  MODE SELECTOR
    // ═══════════════════════════════════════════════════

    modeItems.forEach(btn => {
        btn.addEventListener('click', () => setMode(btn.getAttribute('data-mode')));
    });

    function setMode(mode) {
        currentMode = mode;
        modeItems.forEach(b => b.classList.toggle('active', b.getAttribute('data-mode') === mode));
        outputModeBadge.textContent = mode;
    }

    // ═══════════════════════════════════════════════════
    //  WORD COUNT
    // ═══════════════════════════════════════════════════

    textInput.addEventListener('input', () => {
        const n = textInput.value.trim() === '' ? 0 : textInput.value.trim().split(/\s+/).length;
        wordCountBadge.textContent = `${n} word${n !== 1 ? 's' : ''}`;
    });

    // ═══════════════════════════════════════════════════
    //  TEXT IMPROVEMENT
    // ═══════════════════════════════════════════════════

    improveBtn.addEventListener('click', async () => {
        const text = textInput.value.trim();
        if (!text || isProcessing) return;
        setLoadingState(true);

        // Animate divider icon
        const dividerIcon = document.getElementById('panels-divider-icon');
        if (dividerIcon) dividerIcon.style.color = '#a988ff';

        suggestionsContainer.innerHTML = `
            <div class="suggestion-result" id="result-area">
                <button class="copy-btn hidden" id="copy-btn">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    Copy
                </button>
                <div id="streaming-text"></div>
            </div>
        `;

        const textElement = document.getElementById('streaming-text');
        const copyBtn     = document.getElementById('copy-btn');

        try {
            const body = { text, mode: currentMode };
            if (currentProfile) body.profile_id = currentProfile.id;

            const response = await fetch(`${SERVER_URL}/stream-improve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error();
            const reader  = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText  = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;

                const cut = fullText.match(/\n-?\s*(Response|AI|Output|Rewrite|Here is|Note|Suggestion):?.*$/is);
                if (cut) { fullText = fullText.substring(0, cut.index); }
                textElement.innerHTML = escapeHTML(fullText).replace(/\n/g, '<br>');
                if (cut) break;
                suggestionsContainer.scrollTop = suggestionsContainer.scrollHeight;
            }

            setLoadingState(false);
            if (dividerIcon) dividerIcon.style.color = '';
            copyBtn.classList.remove('hidden');

            copyBtn.addEventListener('click', async () => {
                await navigator.clipboard.writeText(fullText).catch(() => {});
                copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                setTimeout(() => { copyBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`; }, 1800);
            });

        } catch {
            suggestionsContainer.innerHTML = `<div class="empty-state"><p style="color:#ef6767">Connection error. Is the server running?</p></div>`;
            setLoadingState(false);
            if (dividerIcon) dividerIcon.style.color = '';
        }
    });

    function setLoadingState(loading) {
        isProcessing = loading;
        textInput.disabled = loading;
        improveBtn.disabled = loading;
        btnText.textContent = loading ? 'Improving…' : 'Improve Text';
        spinner.classList.toggle('hidden', !loading);
    }

    function escapeHTML(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
    function escapeAttr(str) { return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

    // ── Boot ──
    initProfiles();
});
