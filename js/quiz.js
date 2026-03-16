// ============== Quiz Module ==============
// Multiple choice & true/false quizzes

const Quiz = {
    questions: [],
    idx: 0,
    score: 0,
    active: false,
    selectedTopics: [],

    init() {
        this.populateFilters();
        this.bindEvents();
        this.renderTopics();
    },

    populateFilters() {
        const deck = document.getElementById('qDeck');
        const chapter = document.getElementById('qChapter');
        deck.innerHTML = '<option value="all">All Decks</option>';
        Cards.getDeckNames().forEach(d => deck.innerHTML += `<option value="${d}">${d}</option>`);
        chapter.innerHTML = '<option value="all">All Chapters</option>';
        Cards.getChapters().forEach(c => chapter.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
        this.renderTypePills();
        this.renderTopics();
    },

    renderTypePills() {
        const deck = document.getElementById('qDeck').value;
        const types = Cards.getTypes(deck);
        const container = document.getElementById('qTypePills');
        container.innerHTML = `<button class="pill active" data-type="all">All</button>` +
            types.map(t => `<button class="pill" data-type="${t}">${t}</button>`).join('');
        container.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTopics = [];
                this.renderTopics();
            });
        });
    },

    getSelectedType() {
        const el = document.querySelector('#qTypePills .pill.active');
        return el ? el.dataset.type : 'all';
    },

    renderTopics() {
        const deck = document.getElementById('qDeck').value;
        const type = this.getSelectedType();
        const chapter = document.getElementById('qChapter').value;
        const counts = Cards.getTopicCounts(deck, type, chapter);
        const topics = Object.keys(counts).sort();
        const list = document.getElementById('qTopicList');

        list.innerHTML = topics.map(t => `
            <label class="topic-item">
                <input type="checkbox" value="${t}"
                    ${this.selectedTopics.length === 0 || this.selectedTopics.includes(t) ? 'checked' : ''}>
                <span>${t}</span>
                <span class="topic-count">${counts[t]}</span>
            </label>
        `).join('');

        list.querySelectorAll('input').forEach(cb => {
            cb.addEventListener('change', () => this._syncTopics());
        });
        this._updateTopicLabel();
    },

    _syncTopics() {
        const boxes = document.querySelectorAll('#qTopicList input');
        const all = Array.from(boxes).map(b => b.value);
        const checked = Array.from(boxes).filter(b => b.checked).map(b => b.value);
        this.selectedTopics = (checked.length === all.length || checked.length === 0) ? [] : checked;
        this._updateTopicLabel();
    },

    _updateTopicLabel() {
        const label = document.getElementById('qTopicLabel');
        if (this.selectedTopics.length === 0) label.textContent = 'All Topics';
        else if (this.selectedTopics.length === 1) label.textContent = this.selectedTopics[0];
        else label.textContent = `${this.selectedTopics.length} topics`;
    },

    selectAllTopics() {
        document.querySelectorAll('#qTopicList input').forEach(cb => cb.checked = true);
        this.selectedTopics = [];
        this._updateTopicLabel();
    },

    deselectAllTopics() {
        document.querySelectorAll('#qTopicList input').forEach(cb => cb.checked = false);
        this.selectedTopics = [];
        this._updateTopicLabel();
    },

    bindEvents() {
        document.getElementById('qTopicToggle').addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('qTopicContainer').classList.toggle('open');
        });
        document.addEventListener('click', e => {
            const c = document.getElementById('qTopicContainer');
            if (c && !c.contains(e.target)) c.classList.remove('open');
        });
        document.getElementById('qDeck').addEventListener('change', () => {
            const deck = document.getElementById('qDeck').value;
            const ch = document.getElementById('qChapter');
            ch.innerHTML = '<option value="all">All Chapters</option>';
            Cards.getChapters(deck).forEach(c => ch.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
            this.selectedTopics = [];
            this.renderTypePills();
            this.renderTopics();
        });
        document.getElementById('qChapter').addEventListener('change', () => this.renderTopics());
    },

    start() {
        const opts = {
            deck: document.getElementById('qDeck').value,
            type: this.getSelectedType(),
            chapter: document.getElementById('qChapter').value,
            topics: this.selectedTopics.length > 0 ? this.selectedTopics : null
        };
        let cards = Cards.filter(opts);
        if (cards.length < 2) { alert('Need at least 2 cards.'); return; }

        const quizType = document.getElementById('qStyle').value;
        cards = Cards.shuffle(cards);
        const countVal = document.getElementById('qCount').value;
        const count = countVal === 'all' ? cards.length : Math.min(parseInt(countVal), cards.length);
        cards = cards.slice(0, count);

        this.questions = cards.map(c => this._genQ(c, opts.deck, quizType));
        this.idx = 0;
        this.score = 0;
        this.active = true;

        document.getElementById('qSetup').style.display = 'none';
        document.getElementById('qActive').style.display = 'block';
        document.getElementById('qResults').style.display = 'none';
        this.showQuestion();
    },

    _genQ(card, deck, quizType) {
        const mc = quizType === 'multiple' || (quizType === 'mixed' && Math.random() > 0.5);
        if (mc) return this._genMC(card, deck);
        return this._genTF(card, deck);
    },

    _genMC(card, deck) {
        let pool = Cards.filter({ deck, type: card.type });
        if (pool.length < 4) pool = Cards.filter({ deck });
        const wrongs = pool
            .filter(c => c.id !== card.id && c.back !== card.back)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(c => Cards.extractAnswer(c.back));
        while (wrongs.length < 3) wrongs.push(`Option ${wrongs.length + 1}`);
        const correct = Cards.extractAnswer(card.back);
        const opts = Cards.shuffle([correct, ...wrongs]);
        return { type: 'mc', q: card.front, opts, answer: opts.indexOf(correct), card };
    },

    _genTF(card, deck) {
        const isTrue = Math.random() > 0.5;
        let shown = Cards.extractAnswer(card.back);
        if (!isTrue) {
            let pool = Cards.filter({ deck, type: card.type });
            if (pool.length < 2) pool = Cards.filter({ deck });
            const wrong = pool.filter(c => c.id !== card.id && c.back !== card.back).sort(() => Math.random() - 0.5)[0];
            if (wrong) shown = Cards.extractAnswer(wrong.back);
        }
        return { type: 'tf', q: card.front, shown, isTrue, card };
    },

    showQuestion() {
        const q = this.questions[this.idx];
        document.getElementById('qProgress').textContent = `${this.idx + 1} / ${this.questions.length}`;
        const area = document.getElementById('qArea');
        const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

        if (q.type === 'mc') {
            area.innerHTML = `
                <div class="q-prompt">${esc(q.q)}</div>
                <div class="q-options">${q.opts.map((o, i) =>
                    `<button class="q-opt" data-i="${i}">${esc(o)}</button>`
                ).join('')}</div>`;
            area.querySelectorAll('.q-opt').forEach(btn => {
                btn.addEventListener('click', () => this.answerMC(parseInt(btn.dataset.i)));
            });
        } else {
            area.innerHTML = `
                <div class="q-prompt">${esc(q.q)}</div>
                <div class="q-tf-answer">${esc(q.shown)}</div>
                <div class="q-tf-btns">
                    <button class="q-tf true">✓ True</button>
                    <button class="q-tf false">✗ False</button>
                </div>`;
            area.querySelector('.q-tf.true').addEventListener('click', () => this.answerTF(true));
            area.querySelector('.q-tf.false').addEventListener('click', () => this.answerTF(false));
        }
    },

    answerMC(i) {
        const q = this.questions[this.idx];
        const correct = i === q.answer;
        if (correct) this.score++;
        const btns = document.querySelectorAll('.q-opt');
        btns.forEach((b, j) => {
            b.disabled = true;
            if (j === q.answer) b.classList.add('correct');
            else if (j === i) b.classList.add('incorrect');
        });
        setTimeout(() => this._advance(), 1200);
    },

    answerTF(val) {
        const q = this.questions[this.idx];
        const correct = val === q.isTrue;
        if (correct) this.score++;
        document.querySelectorAll('.q-tf').forEach(b => {
            b.disabled = true;
            const isT = b.classList.contains('true');
            if (isT === q.isTrue) b.classList.add('correct');
            else if (!correct) b.classList.add('incorrect');
        });
        setTimeout(() => this._advance(), 1200);
    },

    _advance() {
        if (this.idx < this.questions.length - 1) {
            this.idx++;
            this.showQuestion();
        } else {
            this.showResults();
        }
    },

    showResults() {
        this.active = false;
        const pct = Math.round((this.score / this.questions.length) * 100);
        document.getElementById('qActive').style.display = 'none';
        document.getElementById('qResults').style.display = 'block';
        document.getElementById('qScore').textContent = `${this.score} / ${this.questions.length} (${pct}%)`;
    },

    retry() {
        document.getElementById('qResults').style.display = 'none';
        this.start();
    },

    backToSetup() {
        document.getElementById('qResults').style.display = 'none';
        document.getElementById('qActive').style.display = 'none';
        document.getElementById('qSetup').style.display = 'block';
    }
};
