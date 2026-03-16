// ============== Study Module ==============
// Flashcard study: Drill/Spaced, Front↔Back direction, Must Get Right

const Study = {
    cards: [],
    idx: 0,
    flipped: false,
    active: false,
    mode: 'drill',         // 'drill' | 'spaced'
    direction: 'front',    // 'front' = show front guess back, 'back' = show back guess front
    mustGetRight: false,
    selectedTopics: [],
    selectedTypes: [],
    expandedTopics: {},
    stats: { got: 0, missed: 0, rounds: 1 },
    cardStats: {},         // { cardId: { attempts, misses, gotRight, card } }
    retryQueue: [],

    init() {
        this.populateFilters();
        this.bindEvents();
        this.renderTopics();
    },

    // ─── Filters ────────────────────────────────────────────

    populateFilters() {
        const deck = document.getElementById('sDeck');
        const chapter = document.getElementById('sChapter');
        deck.innerHTML = '<option value="all">All Decks</option>';
        Cards.getDeckNames().forEach(d => deck.innerHTML += `<option value="${d}">${d}</option>`);
        chapter.innerHTML = '<option value="all">All Chapters</option>';
        Cards.getChapters().forEach(c => chapter.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
        this.renderTypePills();
        this.renderTopics();
        this.updateCount();
    },

    renderTypePills() {
        const deck = document.getElementById('sDeck').value;
        const types = Cards.getTypes(deck);
        const container = document.getElementById('sTypePills');

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
        const deck = document.getElementById('sDeck').value;
        const types = this.getSelectedTypes();
        const chapter = document.getElementById('sChapter').value;
        const cardsByTopic = Cards.getCardsByTopic(deck, types, chapter);
        const topics = Object.keys(cardsByTopic).sort();
        const list = document.getElementById('sTopicList');

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
        const boxes = document.querySelectorAll('#sTopicList input');
        const all = Array.from(boxes).map(b => b.value);
        const checked = Array.from(boxes).filter(b => b.checked).map(b => b.value);
        this.selectedTopics = (checked.length === all.length || checked.length === 0) ? [] : checked;
        this._updateTopicLabel();
        this.updateCount();
        if (this.active) this.reset();
    },

    _updateTopicLabel() {
        const label = document.getElementById('sTopicLabel');
        if (this.selectedTopics.length === 0) label.textContent = 'All Topics';
        else if (this.selectedTopics.length === 1) label.textContent = this.selectedTopics[0];
        else label.textContent = `${this.selectedTopics.length} topics`;
    },

    selectAllTopics() {
        document.querySelectorAll('#sTopicList input').forEach(cb => cb.checked = true);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.updateCount();
    },

    deselectAllTopics() {
        document.querySelectorAll('#sTopicList input').forEach(cb => cb.checked = false);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.updateCount();
    },

    // ─── Events ─────────────────────────────────────────────

    bindEvents() {
        // Mode buttons
        document.getElementById('sDrillBtn').addEventListener('click', () => this.setMode('drill'));
        document.getElementById('sSpacedBtn').addEventListener('click', () => this.setMode('spaced'));

        // Direction buttons
        document.getElementById('sDirFront').addEventListener('click', () => this.setDirection('front'));
        document.getElementById('sDirBack').addEventListener('click', () => this.setDirection('back'));

        // Must Get Right — live
        document.getElementById('sMustGetRight').addEventListener('change', e => {
            this.mustGetRight = e.target.checked;
        });

        // Topic panel
        document.getElementById('sTopicToggle').addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('sTopicContainer').classList.toggle('open');
        });
        document.addEventListener('click', e => {
            const c = document.getElementById('sTopicContainer');
            if (c && !c.contains(e.target)) c.classList.remove('open');
        });

        // Deck change → refresh chapter, types, topics
        document.getElementById('sDeck').addEventListener('change', () => {
            const deck = document.getElementById('sDeck').value;
            const ch = document.getElementById('sChapter');
            ch.innerHTML = '<option value="all">All Chapters</option>';
            Cards.getChapters(deck).forEach(c => ch.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
            this.selectedTopics = [];
            this.renderTypePills();
            this.renderTopics();
            this.updateCount();
            if (this.active) this.reset();
        });

        document.getElementById('sChapter').addEventListener('change', () => {
            this.renderTopics();
            this.updateCount();
            if (this.active) this.reset();
        });

        // Keyboard: space to flip, left/right arrows
        document.addEventListener('keydown', e => {
            if (!this.active || App.currentView !== 'study') return;
            if (e.key === ' ' && !e.target.matches('input, textarea, select')) {
                e.preventDefault();
                this.flip();
            }
        });
    },

    setMode(mode) {
        this.mode = mode;
        document.getElementById('sDrillBtn').classList.toggle('active', mode === 'drill');
        document.getElementById('sSpacedBtn').classList.toggle('active', mode === 'spaced');
        document.getElementById('sDrillOpts').style.display = mode === 'drill' ? 'block' : 'none';
        this.updateCount();
        if (this.active) this.reset();
    },

    setDirection(dir) {
        this.direction = dir;
        document.getElementById('sDirFront').classList.toggle('active', dir === 'front');
        document.getElementById('sDirBack').classList.toggle('active', dir === 'back');
        if (this.active) this.reset();
    },

    // ─── Card Count & Start ─────────────────────────────────

    updateCount() {
        const opts = this._filterOpts();
        if (this.mode === 'spaced') opts.dueOnly = true;
        const n = Cards.filter(opts).length;
        const btn = document.getElementById('sStartBtn');
        if (n === 0) {
            btn.textContent = this.mode === 'spaced' ? 'No cards due' : 'No cards match';
            btn.disabled = true;
        } else {
            btn.textContent = `${this.mode === 'drill' ? 'Drill' : 'Study'} ${n} Cards`;
            btn.disabled = false;
        }
    },

    _filterOpts() {
        return {
            deck: document.getElementById('sDeck').value,
            types: this.getSelectedTypes(),
            chapter: document.getElementById('sChapter').value,
            topics: this.selectedTopics.length > 0 ? this.selectedTopics : null
        };
    },

    start(cardIds = null) {
        const opts = this._filterOpts();
        if (cardIds) opts.ids = cardIds;
        else if (this.mode === 'spaced') opts.dueOnly = true;

        this.cards = Cards.filter(opts);
        if (this.cards.length === 0) {
            alert(this.mode === 'spaced' ? 'No cards due.' : 'No cards match.');
            return;
        }

        this.mustGetRight = document.getElementById('sMustGetRight').checked;
        this.cards = Cards.shuffle(this.cards);
        this.idx = 0;
        this.flipped = false;
        this.active = true;
        this.stats = { got: 0, missed: 0, rounds: 1 };
        this.retryQueue = [];
        this.cardStats = {};
        this.cards.forEach(c => {
            this.cardStats[c.id] = { attempts: 0, misses: 0, gotRight: false, card: c };
        });

        this.showCard();
        this.updateProgress();
        this.updateControls();
        document.getElementById('sStartBtn').style.display = 'none';
        document.getElementById('sEndBtn').style.display = this.mode === 'drill' ? 'block' : 'none';
    },

    // ─── Card Display ───────────────────────────────────────

    showCard() {
        const card = this.cards[this.idx];
        if (!card) return;

        this.flipped = false;
        const fc = document.getElementById('sFlashcard');
        fc.classList.remove('flipped');

        let meta = card.deck;
        if (card.chapter) meta += ` · Ch. ${card.chapter}`;
        if (card.topic) meta += ` · ${card.topic}`;
        document.getElementById('sCardMeta').textContent = meta;
        document.getElementById('sCardHint').textContent = 'Click or press space to flip';

        if (this.direction === 'front') {
            document.getElementById('sCardContent').textContent = card.front;
            document.getElementById('sCardBadge').textContent = card.type;
        } else {
            document.getElementById('sCardBadge').textContent = 'definition';
            document.getElementById('sCardContent').textContent = Cards.getDefinition(card.back);
        }
    },

    flip() {
        if (!this.active || this.cards.length === 0) return;
        const card = this.cards[this.idx];
        this.flipped = !this.flipped;
        const fc = document.getElementById('sFlashcard');

        if (this.flipped) {
            fc.classList.add('flipped');
            document.getElementById('sCardContent').textContent =
                this.direction === 'front' ? card.back : card.front;
            document.getElementById('sCardHint').textContent = 'Click to see prompt';
        } else {
            fc.classList.remove('flipped');
            document.getElementById('sCardContent').textContent =
                this.direction === 'front' ? card.front : Cards.getDefinition(card.back);
            document.getElementById('sCardHint').textContent = 'Click or press space to flip';
        }
        this.updateControls();
    },

    // ─── Rating ─────────────────────────────────────────────

    rate(gotIt) {
        if (!this.active || !this.flipped) return;
        const card = this.cards[this.idx];

        this.cardStats[card.id].attempts++;
        if (gotIt) {
            this.stats.got++;
            this.cardStats[card.id].gotRight = true;
        } else {
            this.stats.missed++;
            this.cardStats[card.id].misses++;
            if (this.mustGetRight && this.mode === 'drill') this.retryQueue.push(card);
        }
        if (this.mode === 'spaced') Cards.rateCard(card.id, gotIt);

        this.idx++;
        if (this.idx >= this.cards.length) this.handleEnd();
        else { this.showCard(); this.updateProgress(); this.updateControls(); }
    },

    // ─── Navigation ─────────────────────────────────────────

    prev() {
        if (this.idx > 0) {
            this.idx--;
            this.showCard();
            this.updateProgress();
            this.updateControls();
        }
    },

    next() {
        if (this.mode === 'drill') {
            this.idx++;
            if (this.idx >= this.cards.length) this.handleEnd();
            else { this.showCard(); this.updateProgress(); this.updateControls(); }
        } else if (this.idx < this.cards.length - 1) {
            this.idx++;
            this.showCard();
            this.updateProgress();
            this.updateControls();
        }
    },

    // ─── Progress ───────────────────────────────────────────

    updateProgress() {
        const pct = this.cards.length > 0 ? (this.idx / this.cards.length) * 100 : 0;
        document.getElementById('sProgressFill').style.width = pct + '%';
        let text = `${this.idx + 1} / ${this.cards.length}`;
        if (this.mode === 'drill') text += ` · Round ${this.stats.rounds}`;
        if (this.mustGetRight && this.retryQueue.length > 0) text += ` · ${this.retryQueue.length} to retry`;
        document.getElementById('sProgressText').textContent = text;
    },

    updateControls() {
        document.getElementById('sPrev').disabled = this.idx === 0;
        document.getElementById('sNext').disabled = this.mode !== 'drill' && this.idx >= this.cards.length - 1;
        document.getElementById('sGot').disabled = !this.flipped;
        document.getElementById('sMiss').disabled = !this.flipped;
    },

    // ─── End of Deck ────────────────────────────────────────

    handleEnd() {
        if (this.mode === 'drill') {
            if (this.mustGetRight && this.retryQueue.length > 0) {
                this.cards = Cards.shuffle([...this.retryQueue]);
                this.retryQueue = [];
                this.idx = 0;
                this.showCard(); this.updateProgress(); this.updateControls();
                return;
            }
            if (this.mustGetRight) { this.endSession(); return; }
            this.idx = 0;
            this.stats.rounds++;
            this.cards = Cards.shuffle(this.cards);
            this.showCard(); this.updateProgress(); this.updateControls();
        } else {
            this.endSession();
        }
    },

    endSession() {
        this.active = false;
        this._saveHistory();
        this._showComplete();
    },

    // ─── Session History & Overlay ──────────────────────────

    _saveHistory() {
        Storage.saveSession({
            date: new Date().toISOString(),
            mode: this.mode + (this.mustGetRight ? '+mgr' : ''),
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
        overlay.id = 'sessionOverlay';
        overlay.innerHTML = `
            <div class="overlay-content">
                <h2>🎉 Session Complete!</h2>
                <p class="overlay-sub">${data.length} cards reviewed</p>
                <div class="session-stats">
                    <div class="ss"><div class="ss-val got">${this.stats.got}</div><div class="ss-label">Correct</div></div>
                    <div class="ss"><div class="ss-val missed">${this.stats.missed}</div><div class="ss-label">Missed</div></div>
                    ${this.mode === 'drill' && !this.mustGetRight ? `<div class="ss"><div class="ss-val rounds">${this.stats.rounds}</div><div class="ss-label">Rounds</div></div>` : ''}
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
                    </div>
                ` : ''}
                <div class="overlay-actions">
                    <button class="btn primary" onclick="Study.restart()">Study Again</button>
                    <button class="btn" onclick="Study.closeOverlay(); App.switchView('home');">Home</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
    },

    closeOverlay() {
        const el = document.getElementById('sessionOverlay');
        if (el) el.remove();
    },

    restart() {
        this.closeOverlay();
        this.start();
    },

    reset() {
        this.cards = []; this.idx = 0; this.flipped = false; this.active = false;
        this.stats = { got: 0, missed: 0, rounds: 1 };
        this.cardStats = {}; this.retryQueue = [];
        document.getElementById('sCardContent').textContent = 'Press Start to begin';
        document.getElementById('sCardBadge').textContent = '';
        document.getElementById('sCardMeta').textContent = '';
        document.getElementById('sCardHint').textContent = '';
        document.getElementById('sProgressFill').style.width = '0%';
        document.getElementById('sProgressText').textContent = '0 / 0';
        document.getElementById('sFlashcard').classList.remove('flipped');
        document.getElementById('sStartBtn').style.display = 'block';
        document.getElementById('sEndBtn').style.display = 'none';
        this.updateCount();
        this.updateControls();
    }
};
