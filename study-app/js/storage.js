// ============== Storage Module ==============
// localStorage wrapper for decks, card progress, and session history

const Storage = {
    DECKS_KEY: 'studyapp_decks',
    CARD_PREFIX: 'studyapp_card_',
    HISTORY_KEY: 'studyapp_session_history',

    // ─── Deck CRUD ──────────────────────────────────────────

    getDecks() {
        return JSON.parse(localStorage.getItem(this.DECKS_KEY) || '{}');
    },

    saveDecks(decks) {
        localStorage.setItem(this.DECKS_KEY, JSON.stringify(decks));
    },

    addDeck(name, data) {
        const decks = this.getDecks();
        decks[name] = data;
        this.saveDecks(decks);
    },

    removeDeck(name) {
        const decks = this.getDecks();
        delete decks[name];
        this.saveDecks(decks);
    },

    // ─── Card Progress (SM-2 spaced repetition data) ────────

    getCardProgress(cardId) {
        const stored = localStorage.getItem(this.CARD_PREFIX + cardId);
        if (stored) return JSON.parse(stored);
        return {
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            dueDate: new Date().toISOString().split('T')[0],
            lastReview: null,
            totalReviews: 0,
            correctCount: 0
        };
    },

    saveCardProgress(cardId, data) {
        localStorage.setItem(this.CARD_PREFIX + cardId, JSON.stringify(data));
    },

    // ─── Session History ────────────────────────────────────

    getHistory() {
        return JSON.parse(localStorage.getItem(this.HISTORY_KEY) || '[]');
    },

    saveSession(session) {
        let history = this.getHistory();
        history.unshift(session);
        if (history.length > 50) history = history.slice(0, 50);
        localStorage.setItem(this.HISTORY_KEY, JSON.stringify(history));
    },

    // ─── Clear All ──────────────────────────────────────────

    clearAll() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('studyapp_')) keys.push(key);
        }
        keys.forEach(k => localStorage.removeItem(k));
    }
};
