// ============== Fill-in-the-Blank Module ==============
// Type your answer, AI checks it. Examples stripped to prevent cheating.

const FillIn = {
    cards: [],
    idx: 0,
    active: false,
    checking: false,
    checked: false,
    direction: 'front',    // 'front' = see front type back, 'back' = see back type front
    mustGetRight: false,
    selectedTopics: [],
    selectedTypes: [],
    expandedTopics: {},
    stats: { got: 0, missed: 0 },
    cardStats: {},
    retryQueue: [],
    _pendingResult: null,
    aiEnabled: false,

    init() {
        this.populateFilters();
        this.bindEvents();
        this.renderTopics();
    },

    // ─── Filters (same pattern as Study) ────────────────────

    populateFilters() {
        const deck = document.getElementById('fDeck');
        const chapter = document.getElementById('fChapter');
        deck.innerHTML = '<option value="all">All Decks</option>';
        Cards.getDeckNames().forEach(d => deck.innerHTML += `<option value="${d}">${d}</option>`);
        chapter.innerHTML = '<option value="all">All Chapters</option>';
        Cards.getChapters().forEach(c => chapter.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
        this.renderTypePills();
        this.renderTopics();
        this.updateCount();
    },

    renderTypePills() {
        const deck = document.getElementById('fDeck').value;
        const types = Cards.getTypes(deck);
        const container = document.getElementById('fTypePills');

        container.innerHTML = types.map(t => {
            const on = this.selectedTypes.includes(t);
            return `<button class="pill${on ? ' active' : ''}" data-type="${t}">${t}</button>`;
        }).join('');

        container.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const idx = this.selectedTypes.indexOf(type);
                if (idx >= 0) this.selectedTypes.splice(idx, 1);
                else this.selectedTypes.push(type);
                btn.classList.toggle('active');
                this.selectedTopics = [];
                this.renderTopics();
                this.updateCount();
                if (this.active) this.reset();
            });
        });
    },

    getSelectedTypes() {
        return this.selectedTypes;
    },

    renderTopics() {
        const deck = document.getElementById('fDeck').value;
        const types = this.getSelectedTypes();
        const chapter = document.getElementById('fChapter').value;
        const cardsByTopic = Cards.getCardsByTopic(deck, types, chapter);
        const topics = Object.keys(cardsByTopic).sort();
        const list = document.getElementById('fTopicList');

        list.innerHTML = topics.map(t => {
            const cards = cardsByTopic[t];
            const checked = this.selectedTopics.length === 0 || this.selectedTopics.includes(t);
            const isOpen = this.expandedTopics[t] === true;

            let cardsHtml = '';
            if (isOpen) {
                cardsHtml = '<div class="topic-cards">' +
                    cards.map(c => `<div class="topic-card-row"><span>${c.front}</span></div>`).join('') +
                    '</div>';
            }

            return `<div class="topic-group">
                <div class="topic-item">
                    <input type="checkbox" value="${t}" ${checked ? 'checked' : ''}>
                    <span class="topic-name-text">${t}</span>
                    <span class="topic-count">${cards.length}</span>
                    <button class="topic-expand-btn" data-topic="${t}">${isOpen ? '▼' : '▶'}</button>
                </div>
                ${cardsHtml}
            </div>`;
        }).join('');

        list.querySelectorAll('.topic-item input').forEach(cb => {
            cb.addEventListener('change', () => this._syncTopics());
        });
        list.querySelectorAll('.topic-expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const topic = btn.dataset.topic;
                this.expandedTopics[topic] = !this.expandedTopics[topic];
                this.renderTopics();
            });
        });
        this._updateTopicLabel();
    },

    _syncTopics() {
        const boxes = document.querySelectorAll('#fTopicList input');
        const all = Array.from(boxes).map(b => b.value);
        const checked = Array.from(boxes).filter(b => b.checked).map(b => b.value);
        this.selectedTopics = (checked.length === all.length || checked.length === 0) ? [] : checked;
        this._updateTopicLabel();
        this.updateCount();
        if (this.active) this.reset();
    },

    _updateTopicLabel() {
        const label = document.getElementById('fTopicLabel');
        if (this.selectedTopics.length === 0) label.textContent = 'All Topics';
        else if (this.selectedTopics.length === 1) label.textContent = this.selectedTopics[0];
        else label.textContent = `${this.selectedTopics.length} topics`;
    },

    selectAllTopics() {
        document.querySelectorAll('#fTopicList input').forEach(cb => cb.checked = true);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.updateCount();
    },

    deselectAllTopics() {
        document.querySelectorAll('#fTopicList input').forEach(cb => cb.checked = false);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.updateCount();
    },

    // ─── Events ─────────────────────────────────────────────

    bindEvents() {
        // Direction toggle
        document.getElementById('fDirFront').addEventListener('click', () => this.setDirection('front'));
        document.getElementById('fDirBack').addEventListener('click', () => this.setDirection('back'));

        // Must Get Right — live
        document.getElementById('fMustGetRight').addEventListener('change', e => {
            this.mustGetRight = e.target.checked;
        });

        // AI toggle with connection check
        document.getElementById('fSmartCheck').addEventListener('change', async e => {
            const status = document.getElementById('fAiStatus');
            if (e.target.checked) {
                status.textContent = 'Connecting...';
                status.className = 'ai-status checking';
                const r = await Ollama.checkConnection();
                if (r.ok) {
                    this.aiEnabled = true;
                    status.textContent = '● Connected';
                    status.className = 'ai-status connected';
                } else {
                    e.target.checked = false;
                    this.aiEnabled = false;
                    status.textContent = '● ' + r.reason;
                    status.className = 'ai-status error';
                    setTimeout(() => { status.textContent = ''; status.className = 'ai-status'; }, 5000);
                }
            } else {
                this.aiEnabled = false;
                status.textContent = '';
                status.className = 'ai-status';
            }
        });

        // Topic panel
        document.getElementById('fTopicToggle').addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('fTopicContainer').classList.toggle('open');
        });
        document.addEventListener('click', e => {
            const c = document.getElementById('fTopicContainer');
            if (c && !c.contains(e.target)) c.classList.remove('open');
        });

        // Deck / chapter change
        document.getElementById('fDeck').addEventListener('change', () => {
            const deck = document.getElementById('fDeck').value;
            const ch = document.getElementById('fChapter');
            ch.innerHTML = '<option value="all">All Chapters</option>';
            Cards.getChapters(deck).forEach(c => ch.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
            this.selectedTopics = [];
            this.renderTypePills();
            this.renderTopics();
            this.updateCount();
            if (this.active) this.reset();
        });
        document.getElementById('fChapter').addEventListener('change', () => {
            this.renderTopics();
            this.updateCount();
            if (this.active) this.reset();
        });

        // Answer input
        document.getElementById('fInput').addEventListener('keydown', e => {
            if (e.key === 'Enter' && !this.checking) {
                e.preventDefault();
                this.submit();
            }
        });
        document.getElementById('fCheckBtn').addEventListener('click', () => {
            if (!this.checking) this.submit();
        });

        // Override & Next
        document.getElementById('fOverrideRight').addEventListener('click', () => this.override(true));
        document.getElementById('fOverrideWrong').addEventListener('click', () => this.override(false));
        document.getElementById('fNextBtn').addEventListener('click', () => this.advance());

        // Keyboard: Enter after check to advance
        document.addEventListener('keydown', e => {
            if (!this.active || App.currentView !== 'fillin') return;
            if (e.key === 'Enter' && this.checked && !this.checking) {
                e.preventDefault();
                this.advance();
            }
        });
    },

    setDirection(dir) {
        this.direction = dir;
        document.getElementById('fDirFront').classList.toggle('active', dir === 'front');
        document.getElementById('fDirBack').classList.toggle('active', dir === 'back');
        if (this.active) this.reset();
    },

    // ─── Count & Start ──────────────────────────────────────

    updateCount() {
        const n = Cards.filter(this._filterOpts()).length;
        const btn = document.getElementById('fStartBtn');
        btn.textContent = n === 0 ? 'No cards match' : `Start · ${n} Cards`;
        btn.disabled = n === 0;
    },

    _filterOpts() {
        return {
            deck: document.getElementById('fDeck').value,
            types: this.getSelectedTypes(),
            chapter: document.getElementById('fChapter').value,
            topics: this.selectedTopics.length > 0 ? this.selectedTopics : null
        };
    },

    start(cardIds = null) {
        const opts = this._filterOpts();
        if (cardIds && cardIds.length > 0) opts.ids = cardIds;
        this.cards = Cards.filter(opts);
        if (this.cards.length === 0) { alert('No cards match.'); return; }

        this.mustGetRight = document.getElementById('fMustGetRight').checked;
        this.cards = Cards.shuffle(this.cards);
        this.idx = 0;
        this.active = true;
        this.checking = false;
        this.checked = false;
        this.stats = { got: 0, missed: 0 };
        this.retryQueue = [];
        this.cardStats = {};
        this.cards.forEach(c => {
            this.cardStats[c.id] = { attempts: 0, misses: 0, gotRight: false, card: c };
        });

        document.getElementById('fStartBtn').style.display = 'none';
        document.getElementById('fEndBtn').style.display = 'block';
        this.showCard();
        this.updateProgress();
    },

    // ─── Card Display ───────────────────────────────────────

    showCard() {
        const card = this.cards[this.idx];
        if (!card) return;
        this.checked = false;
        this.checking = false;

        // Direction determines what's shown vs what you type
        let prompt, badge;
        if (this.direction === 'front') {
            prompt = card.front;
            badge = card.type;
        } else {
            // Back→Front: quick strip first, then AI-cleaned
            prompt = Cards.stripExamples(card.back);
            badge = 'definition';
        }

        document.getElementById('fPrompt').textContent = prompt;

        // Fire AI strip in background for Back→Front
        if (this.direction === 'back') {
            Ollama.stripHints(card.back, card.front).then(cleaned => {
                if (this.cards[this.idx] === card && !this.checked) {
                    document.getElementById('fPrompt').textContent = cleaned;
                }
            });
        }
        let meta = card.deck;
        if (card.chapter) meta += ` · Ch. ${card.chapter}`;
        if (card.topic) meta += ` · ${card.topic}`;
        document.getElementById('fMeta').textContent = meta;
        document.getElementById('fBadge').textContent = badge;

        // Reset answer area
        const input = document.getElementById('fInput');
        input.value = '';
        input.disabled = false;
        document.getElementById('fCheckBtn').style.display = 'inline-flex';
        document.getElementById('fCheckBtn').disabled = false;
        document.getElementById('fLoader').style.display = 'none';
        document.getElementById('fFeedback').style.display = 'none';
        document.getElementById('fFeedback').className = 'fi-feedback';
        document.getElementById('fAnswer').style.display = 'none';
        document.getElementById('fNav').style.display = 'none';

        setTimeout(() => input.focus(), 50);
    },

    // ─── Submit Answer ──────────────────────────────────────

    async submit() {
        if (!this.active || this.checking || this.checked) return;

        const input = document.getElementById('fInput');
        const userAnswer = input.value.trim();
        if (!userAnswer) {
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
            return;
        }

        const card = this.cards[this.idx];

        // Direction determines what the correct answer is
        let correctAnswer, revealedText, questionText;
        if (this.direction === 'front') {
            correctAnswer = Cards.extractAnswer(card.back);
            revealedText = Cards.stripExamples(card.back);
            questionText = card.front;
        } else {
            correctAnswer = card.front;
            revealedText = card.front;
            questionText = Cards.stripExamples(card.back);
        }

        // Lock input, show loader
        this.checking = true;
        input.disabled = true;
        document.getElementById('fCheckBtn').style.display = 'none';
        document.getElementById('fLoader').style.display = 'flex';

        // Rotate messages
        const msgs = ['🤔 Checking...', '🧠 Analyzing...', '📝 Almost...'];
        let mi = 0;
        const loaderText = document.getElementById('fLoaderText');
        loaderText.textContent = msgs[0];
        const interval = setInterval(() => {
            mi = (mi + 1) % msgs.length;
            loaderText.textContent = msgs[mi];
        }, 1500);

        // Check answer
        let result;
        if (this.aiEnabled) {
            result = await Ollama.checkAnswer(userAnswer, correctAnswer, questionText, this.direction);
        } else {
            result = Ollama._fallback(userAnswer, correctAnswer);
        }

        clearInterval(interval);
        this.checking = false;
        this.checked = true;

        // Show correct answer
        const answerEl = document.getElementById('fAnswer');
        answerEl.textContent = revealedText;
        answerEl.style.display = 'block';

        // Apply rating
        this._pendingResult = result.isCorrect;
        this._applyRating(result.isCorrect);

        // Show feedback
        this.showFeedback(result, userAnswer);
    },

    showFeedback(result, userAnswer) {
        document.getElementById('fLoader').style.display = 'none';

        const fb = document.getElementById('fFeedback');
        const confColor = result.confidence >= 80 ? '#10b981' : result.confidence >= 50 ? '#f59e0b' : '#ef4444';

        document.getElementById('fFbIcon').textContent = result.isCorrect ? '✅' : '❌';
        document.getElementById('fFbLabel').textContent = result.isCorrect ? 'Correct!' : 'Not quite';
        document.getElementById('fFbLabel').className = 'fb-label ' + (result.isCorrect ? 'correct' : 'incorrect');
        document.getElementById('fFbText').textContent = result.feedback;
        document.getElementById('fFbConf').innerHTML = `<span style="color:${confColor}">${result.confidence}%</span> confidence`;

        const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };
        document.getElementById('fFbUser').innerHTML = `Your answer: <strong>${esc(userAnswer)}</strong>`;

        const src = document.getElementById('fFbSource');
        src.style.display = result.source === 'fallback' ? 'block' : 'none';
        if (result.source === 'fallback') src.textContent = '⚠ AI unavailable — used exact match';

        fb.style.display = 'block';
        fb.className = 'fi-feedback ' + (result.isCorrect ? 'correct' : 'incorrect') + ' show';
        document.getElementById('fNav').style.display = 'flex';
    },

    // ─── Rating ─────────────────────────────────────────────

    _applyRating(gotIt) {
        const card = this.cards[this.idx];
        this.cardStats[card.id].attempts++;
        if (gotIt) {
            this.stats.got++;
            this.cardStats[card.id].gotRight = true;
        } else {
            this.stats.missed++;
            this.cardStats[card.id].misses++;
            if (this.mustGetRight) this.retryQueue.push(card);
        }
        this.updateProgress();
    },

    override(isCorrect) {
        if (!this.checked) return;
        const card = this.cards[this.idx];
        const was = this._pendingResult;
        if (isCorrect === was) return;

        // Undo previous
        if (was) { this.stats.got--; this.cardStats[card.id].gotRight = false; }
        else {
            this.stats.missed--;
            this.cardStats[card.id].misses--;
            const ri = this.retryQueue.indexOf(card);
            if (ri > -1) this.retryQueue.splice(ri, 1);
        }

        this._applyRating(isCorrect);
        this._pendingResult = isCorrect;

        // Update visual
        const fb = document.getElementById('fFeedback');
        document.getElementById('fFbIcon').textContent = isCorrect ? '✅' : '❌';
        document.getElementById('fFbLabel').textContent = isCorrect ? 'Overridden → Correct' : 'Overridden → Wrong';
        document.getElementById('fFbLabel').className = 'fb-label ' + (isCorrect ? 'correct' : 'incorrect');
        fb.className = 'fi-feedback ' + (isCorrect ? 'correct' : 'incorrect') + ' show';
    },

    // ─── Navigation ─────────────────────────────────────────

    advance() {
        this.idx++;
        if (this.idx >= this.cards.length) {
            this.handleEnd();
        } else {
            this.showCard();
            this.updateProgress();
        }
    },

    handleEnd() {
        if (this.mustGetRight && this.retryQueue.length > 0) {
            this.cards = Cards.shuffle([...this.retryQueue]);
            this.retryQueue = [];
            this.idx = 0;
            this.showCard();
            this.updateProgress();
            return;
        }
        if (this.mustGetRight) { this.endSession(); return; }
        // No auto-loop in fill-in mode — end session
        this.endSession();
    },

    endSession() {
        this.active = false;
        this._saveHistory();
        this._showComplete();
    },

    updateProgress() {
        const pct = this.cards.length > 0 ? (this.idx / this.cards.length) * 100 : 0;
        document.getElementById('fProgressFill').style.width = pct + '%';
        let text = `${this.idx + 1} / ${this.cards.length}`;
        if (this.mustGetRight && this.retryQueue.length > 0) text += ` · ${this.retryQueue.length} to retry`;
        document.getElementById('fProgressText').textContent = text;
    },

    // ─── Session Complete ───────────────────────────────────

    _saveHistory() {
        Storage.saveSession({
            date: new Date().toISOString(),
            mode: 'fill-in' + (this.aiEnabled ? '+ai' : '') + (this.mustGetRight ? '+mgr' : ''),
            direction: this.direction,
            totalCards: Object.keys(this.cardStats).length,
            stats: { ...this.stats },
            cards: Object.values(this.cardStats).map(s => ({
                id: s.card.id, front: s.card.front, type: s.card.type,
                topic: s.card.topic, attempts: s.attempts,
                misses: s.misses, gotRight: s.gotRight
            }))
        });
    },

    _showComplete() {
        const total = this.stats.got + this.stats.missed;
        const pct = total > 0 ? Math.round((this.stats.got / total) * 100) : 0;
        const data = Object.values(this.cardStats);
        const first = data.filter(c => c.misses === 0 && c.gotRight).length;
        const retry = data.filter(c => c.misses > 0 && c.gotRight).length;
        const never = data.filter(c => !c.gotRight).length;
        const trouble = data.filter(c => c.misses > 0).sort((a, b) => b.misses - a.misses).slice(0, 10);

        const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        overlay.id = 'fillinOverlay';
        overlay.innerHTML = `
            <div class="overlay-content">
                <h2>🎉 Session Complete!</h2>
                <p class="overlay-sub">${data.length} cards · Fill-in-the-Blank${this.aiEnabled ? ' + AI' : ''}</p>
                <div class="session-stats">
                    <div class="ss"><div class="ss-val got">${this.stats.got}</div><div class="ss-label">Correct</div></div>
                    <div class="ss"><div class="ss-val missed">${this.stats.missed}</div><div class="ss-label">Missed</div></div>
                    <div class="ss"><div class="ss-val accent">${pct}%</div><div class="ss-label">Accuracy</div></div>
                </div>
                <div class="breakdown">
                    <div class="bd-item correct"><span class="bd-n">${first}</span> First try</div>
                    <div class="bd-item retry"><span class="bd-n">${retry}</span> Needed retry</div>
                    ${never > 0 ? `<div class="bd-item wrong"><span class="bd-n">${never}</span> Never got right</div>` : ''}
                </div>
                ${trouble.length > 0 ? `
                    <div class="trouble-section">
                        <h3>Trouble Cards</h3>
                        ${trouble.map(c => `<div class="trouble-row"><span>${esc(c.card.front)}</span><span class="trouble-n">${c.misses}×</span></div>`).join('')}
                    </div>` : ''}
                <div class="overlay-actions">
                    <button class="btn primary" onclick="FillIn.restart()">Again</button>
                    <button class="btn" onclick="FillIn.closeOverlay(); App.switchView('home');">Home</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    },

    closeOverlay() {
        const el = document.getElementById('fillinOverlay');
        if (el) el.remove();
    },

    restart() {
        this.closeOverlay();
        this.start();
    },

    reset() {
        this.cards = []; this.idx = 0; this.active = false;
        this.checking = false; this.checked = false;
        this.stats = { got: 0, missed: 0 };
        this.cardStats = {}; this.retryQueue = [];
        document.getElementById('fPrompt').textContent = 'Press Start to begin';
        document.getElementById('fBadge').textContent = '';
        document.getElementById('fMeta').textContent = '';
        document.getElementById('fInput').value = '';
        document.getElementById('fInput').disabled = false;
        document.getElementById('fCheckBtn').style.display = 'inline-flex';
        document.getElementById('fLoader').style.display = 'none';
        document.getElementById('fFeedback').style.display = 'none';
        document.getElementById('fAnswer').style.display = 'none';
        document.getElementById('fNav').style.display = 'none';
        document.getElementById('fProgressFill').style.width = '0%';
        document.getElementById('fProgressText').textContent = '0 / 0';
        document.getElementById('fStartBtn').style.display = 'block';
        document.getElementById('fEndBtn').style.display = 'none';
        this.updateCount();
    }
};
