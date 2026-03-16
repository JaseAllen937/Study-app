// ============== Browse Module ==============
// Card browsing with filters, selection, expand/collapse

const Browse = {
    selectedIds: new Set(),
    selectedTopics: [],

    init() {
        this.populateFilters();
        this.bindEvents();
        this.renderTopics();
        this.render();
    },

    populateFilters() {
        const deck = document.getElementById('bDeck');
        const chapter = document.getElementById('bChapter');
        deck.innerHTML = '<option value="all">All Decks</option>';
        Cards.getDeckNames().forEach(d => deck.innerHTML += `<option value="${d}">${d}</option>`);
        chapter.innerHTML = '<option value="all">All Chapters</option>';
        Cards.getChapters().forEach(c => chapter.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
        this.renderTypePills();
        this.renderTopics();
    },

    renderTypePills() {
        const deck = document.getElementById('bDeck').value;
        const types = Cards.getTypes(deck);
        const container = document.getElementById('bTypePills');
        container.innerHTML = `<button class="pill active" data-type="all">All</button>` +
            types.map(t => `<button class="pill" data-type="${t}">${t}</button>`).join('');
        container.querySelectorAll('.pill').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.pill').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedTopics = [];
                this.renderTopics();
                this.render();
            });
        });
    },

    getSelectedType() {
        const el = document.querySelector('#bTypePills .pill.active');
        return el ? el.dataset.type : 'all';
    },

    renderTopics() {
        const deck = document.getElementById('bDeck').value;
        const type = this.getSelectedType();
        const chapter = document.getElementById('bChapter').value;
        const counts = Cards.getTopicCounts(deck, type, chapter);
        const topics = Object.keys(counts).sort();
        const list = document.getElementById('bTopicList');

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
        const boxes = document.querySelectorAll('#bTopicList input');
        const all = Array.from(boxes).map(b => b.value);
        const checked = Array.from(boxes).filter(b => b.checked).map(b => b.value);
        this.selectedTopics = (checked.length === all.length || checked.length === 0) ? [] : checked;
        this._updateTopicLabel();
        this.render();
    },

    _updateTopicLabel() {
        const label = document.getElementById('bTopicLabel');
        if (this.selectedTopics.length === 0) label.textContent = 'All Topics';
        else if (this.selectedTopics.length === 1) label.textContent = this.selectedTopics[0];
        else label.textContent = `${this.selectedTopics.length} topics`;
    },

    selectAllTopics() {
        document.querySelectorAll('#bTopicList input').forEach(cb => cb.checked = true);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.render();
    },

    deselectAllTopics() {
        document.querySelectorAll('#bTopicList input').forEach(cb => cb.checked = false);
        this.selectedTopics = [];
        this._updateTopicLabel();
        this.render();
    },

    bindEvents() {
        document.getElementById('bSearch').addEventListener('input', () => this.render());
        document.getElementById('bTopicToggle').addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('bTopicContainer').classList.toggle('open');
        });
        document.addEventListener('click', e => {
            const c = document.getElementById('bTopicContainer');
            if (c && !c.contains(e.target)) c.classList.remove('open');
        });
        document.getElementById('bDeck').addEventListener('change', () => {
            const deck = document.getElementById('bDeck').value;
            const ch = document.getElementById('bChapter');
            ch.innerHTML = '<option value="all">All Chapters</option>';
            Cards.getChapters(deck).forEach(c => ch.innerHTML += `<option value="${c}">Ch. ${c}</option>`);
            this.selectedTopics = [];
            this.renderTypePills();
            this.renderTopics();
            this.render();
        });
        document.getElementById('bChapter').addEventListener('change', () => {
            this.renderTopics();
            this.render();
        });
    },

    getFiltered() {
        return Cards.filter({
            deck: document.getElementById('bDeck').value,
            type: this.getSelectedType(),
            chapter: document.getElementById('bChapter').value,
            topics: this.selectedTopics.length > 0 ? this.selectedTopics : null,
            search: document.getElementById('bSearch').value
        });
    },

    render() {
        const cards = this.getFiltered();
        const container = document.getElementById('bCardList');
        document.getElementById('bCount').textContent = `(${cards.length})`;

        if (cards.length === 0) {
            container.innerHTML = '<div class="empty-msg">No cards match</div>';
            return;
        }

        const esc = t => { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; };

        container.innerHTML = cards.map(c => `
            <div class="b-card ${this.selectedIds.has(c.id) ? 'selected' : ''}" data-id="${c.id}">
                <div class="b-card-head">
                    <input type="checkbox" class="b-cb" ${this.selectedIds.has(c.id) ? 'checked' : ''}>
                    <div class="b-card-front">${esc(c.front)}</div>
                    <div class="b-card-tags">
                        ${c.topic ? `<span class="tag topic">${c.topic}</span>` : ''}
                        <span class="tag type">${c.type}</span>
                        <span class="b-expand">▼</span>
                    </div>
                </div>
                <div class="b-card-back">${esc(c.back)}</div>
            </div>
        `).join('');

        // Bind events
        container.querySelectorAll('.b-card').forEach(el => {
            const id = el.dataset.id;
            el.querySelector('.b-cb').addEventListener('click', e => {
                e.stopPropagation();
                this.toggleSelect(id);
            });
            el.querySelector('.b-card-head').addEventListener('click', e => {
                if (e.target.matches('.b-cb')) return;
                el.classList.toggle('expanded');
            });
        });

        this.updateSelectBtn();
    },

    toggleSelect(id) {
        if (this.selectedIds.has(id)) this.selectedIds.delete(id);
        else this.selectedIds.add(id);
        const el = document.querySelector(`.b-card[data-id="${id}"]`);
        if (el) el.classList.toggle('selected', this.selectedIds.has(id));
        this.updateSelectBtn();
    },

    selectAll() {
        this.getFiltered().forEach(c => this.selectedIds.add(c.id));
        this.render();
    },

    deselectAll() {
        this.selectedIds.clear();
        this.render();
    },

    updateSelectBtn() {
        const btn = document.getElementById('bStudyBtn');
        btn.textContent = `Study Selected (${this.selectedIds.size})`;
        btn.disabled = this.selectedIds.size === 0;
    },

    studySelected() {
        if (this.selectedIds.size === 0) return;
        App.switchView('study');
        setTimeout(() => Study.start(Array.from(this.selectedIds)), 100);
    }
};
