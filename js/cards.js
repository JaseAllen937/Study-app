// ============== Cards Module ==============
// Card data, filtering, spaced repetition, and content helpers

const Cards = {
    all: [],

    // ─── Load from Storage ──────────────────────────────────

    loadFromStorage() {
        const decks = Storage.getDecks();
        this.all = [];
        for (const [deckName, deck] of Object.entries(decks)) {
            if (!deck.cards) continue;
            deck.cards.forEach(card => {
                this.all.push({ ...card, deck: deckName });
            });
        }
        return this.all;
    },

    // ─── Filtering ──────────────────────────────────────────

    filter(opts = {}) {
        let cards = [...this.all];

        if (opts.deck && opts.deck !== 'all') {
            cards = cards.filter(c => c.deck === opts.deck);
        }
        if (opts.type && opts.type !== 'all') {
            cards = cards.filter(c => c.type === opts.type);
        }
        if (opts.types && opts.types.length > 0) {
            cards = cards.filter(c => opts.types.includes(c.type));
        }
        if (opts.chapter && opts.chapter !== 'all') {
            cards = cards.filter(c => String(c.chapter) === String(opts.chapter));
        }
        if (opts.topics && opts.topics.length > 0) {
            cards = cards.filter(c => opts.topics.includes(c.topic));
        }
        if (opts.search) {
            const term = opts.search.toLowerCase();
            cards = cards.filter(c =>
                c.front.toLowerCase().includes(term) ||
                c.back.toLowerCase().includes(term)
            );
        }
        if (opts.dueOnly) {
            cards = cards.filter(c => this.isDue(c.id));
        }
        if (opts.ids && opts.ids.length > 0) {
            cards = cards.filter(c => opts.ids.includes(c.id));
        }
        return cards;
    },

    // ─── Unique Values for Filters ──────────────────────────

    getDeckNames() {
        return [...new Set(this.all.map(c => c.deck))].sort();
    },

    getTypes(deck = 'all') {
        const cards = deck === 'all' ? this.all : this.all.filter(c => c.deck === deck);
        return [...new Set(cards.map(c => c.type).filter(Boolean))].sort();
    },

    getChapters(deck = 'all') {
        const cards = deck === 'all' ? this.all : this.all.filter(c => c.deck === deck);
        return [...new Set(cards.map(c => c.chapter).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
    },

    getTopics(deck = 'all', type = 'all', chapter = 'all') {
        let cards = [...this.all];
        if (deck !== 'all') cards = cards.filter(c => c.deck === deck);
        if (type !== 'all') cards = cards.filter(c => c.type === type);
        if (chapter !== 'all') cards = cards.filter(c => String(c.chapter) === String(chapter));
        return [...new Set(cards.map(c => c.topic).filter(Boolean))].sort();
    },

    getTopicCounts(deck = 'all', type = 'all', chapter = 'all') {
        let cards = [...this.all];
        if (deck !== 'all') cards = cards.filter(c => c.deck === deck);
        if (type !== 'all') cards = cards.filter(c => c.type === type);
        if (chapter !== 'all') cards = cards.filter(c => String(c.chapter) === String(chapter));
        const counts = {};
        cards.forEach(c => {
            if (c.topic) counts[c.topic] = (counts[c.topic] || 0) + 1;
        });
        return counts;
    },

    // Like getTopicCounts but accepts an array of types
    getTopicCountsForTypes(deck = 'all', types = [], chapter = 'all') {
        let cards = [...this.all];
        if (deck !== 'all') cards = cards.filter(c => c.deck === deck);
        if (types.length > 0) cards = cards.filter(c => types.includes(c.type));
        if (chapter !== 'all') cards = cards.filter(c => String(c.chapter) === String(chapter));
        const counts = {};
        cards.forEach(c => {
            if (c.topic) counts[c.topic] = (counts[c.topic] || 0) + 1;
        });
        return counts;
    },

    // Get actual card objects grouped by topic
    getCardsByTopic(deck = 'all', types = [], chapter = 'all') {
        let cards = [...this.all];
        if (deck !== 'all') cards = cards.filter(c => c.deck === deck);
        if (types.length > 0) cards = cards.filter(c => types.includes(c.type));
        if (chapter !== 'all') cards = cards.filter(c => String(c.chapter) === String(chapter));
        const groups = {};
        cards.forEach(c => {
            const t = c.topic || 'Other';
            if (!groups[t]) groups[t] = [];
            groups[t].push(c);
        });
        return groups;
    },

    // ─── Content Helpers ────────────────────────────────────

    // Extract just the core answer (first meaningful line of the back)
    extractAnswer(text) {
        if (!text) return '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (!lower.startsWith('pronunciation:') &&
                !lower.startsWith('example:') &&
                !lower.startsWith('examples:') &&
                !lower.startsWith('ex:') &&
                !lower.startsWith('note:')) {
                return line;
            }
        }
        return lines[0] || text;
    },

    // Get ONLY the English definition for Back→Front display.
    // Takes first line, strips anything after Gender/Note/Pronunciation markers.
    getDefinition(text) {
        if (!text) return text;
        // Get first meaningful line
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        let def = '';
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (lower.startsWith('pronunciation:') || lower.startsWith('example:') ||
                lower.startsWith('examples:') || lower.startsWith('ex:') ||
                lower.startsWith('note:') || lower.startsWith('notes:') ||
                lower.startsWith('gender:') || lower.startsWith('singular:') ||
                lower.startsWith('plural:')) continue;
            // Skip lines that look French (start with le/la/les/l'/un/une/il/elle/c'est/des)
            if (/^(le |la |les |l'|un |une |il |elle |des |du |au |c'est)/i.test(lower)) continue;
            def = line;
            break;
        }
        if (!def) def = lines[0] || text;
        // Strip mid-line markers
        def = def.replace(/\s*Gender\s*forms?:.*$/i, '');
        def = def.replace(/\s*Note:.*$/i, '');
        def = def.replace(/\s*Pronunciation:.*$/i, '');
        def = def.replace(/\s*[—–-]+\s*(le |la |les |l'|un |une ).*$/i, '');
        def = def.replace(/\s*\[.*?\]/g, '');
        return def.trim() || lines[0] || text;
    },

    // Strip example lines (keeps pronunciation, removes examples)
    // Used in Fill-in-the-Blank and Back→Front study mode
    stripExamples(text) {
        if (!text) return text;
        return text.split('\n')
            .filter(line => {
                const t = line.trim().toLowerCase();
                return !t.startsWith('example:') &&
                       !t.startsWith('examples:') &&
                       !t.startsWith('ex:') &&
                       !t.startsWith('note:') &&
                       !t.startsWith('notes:') &&
                       !t.startsWith('pronunciation:') &&
                       !t.startsWith('gender:') &&
                       !t.startsWith('singular:') &&
                       !t.startsWith('plural:');
            })
            .map(line => {
                // Strip mid-line "Note:" and everything after it
                line = line.replace(/\s*Note:.*$/i, '');
                // Strip mid-line "Pronunciation:" and everything after it
                line = line.replace(/\s*Pronunciation:.*$/i, '');
                // Strip bracketed pronunciation like [bah kee neez]
                line = line.replace(/\s*\[.*?\]/g, '');
                return line.trim();
            })
            .filter(line => line.length > 0)
            .join('\n')
            .trim();
    },

    // ─── Spaced Repetition ──────────────────────────────────

    isDue(cardId) {
        const data = Storage.getCardProgress(cardId);
        const today = new Date().toISOString().split('T')[0];
        return data.dueDate <= today;
    },

    getStatus(cardId) {
        const data = Storage.getCardProgress(cardId);
        if (data.repetitions === 0) return 'new';
        if (data.interval < 7) return 'learning';
        return 'mastered';
    },

    rateCard(cardId, gotIt) {
        const data = Storage.getCardProgress(cardId);
        const today = new Date().toISOString().split('T')[0];

        data.totalReviews++;

        if (gotIt) {
            data.correctCount++;
            if (data.repetitions === 0) data.interval = 1;
            else if (data.repetitions === 1) data.interval = 3;
            else if (data.repetitions === 2) data.interval = 7;
            else data.interval = Math.min(Math.round(data.interval * data.easeFactor), 365);
            data.repetitions++;
            data.easeFactor = Math.min(3.0, data.easeFactor + 0.1);
        } else {
            data.repetitions = 0;
            data.interval = 0;
            data.easeFactor = Math.max(1.3, data.easeFactor - 0.2);
        }

        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + data.interval);
        data.dueDate = nextDue.toISOString().split('T')[0];
        data.lastReview = today;

        Storage.saveCardProgress(cardId, data);
        return data;
    },

    // ─── Stats ──────────────────────────────────────────────

    getStats() {
        const total = this.all.length;
        const due = this.all.filter(c => this.isDue(c.id)).length;
        const mastered = this.all.filter(c => this.getStatus(c.id) === 'mastered').length;
        return { total, due, mastered };
    },

    // ─── Shuffle (Fisher-Yates) ─────────────────────────────

    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
};
