// ============== App Module ==============
// Initialization, navigation, home dashboard, file loading

const App = {
    currentView: 'home',

    init() {
        Cards.loadFromStorage();
        Study.init();
        FillIn.init();
        Browse.init();
        Quiz.init();
        this.bindNav();
        this.bindFileLoader();
        this.updateHome();
    },

    // ─── Navigation ─────────────────────────────────────────

    bindNav() {
        document.querySelectorAll('.nav-btn[data-view]').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
    },

    switchView(view) {
        document.querySelectorAll('.nav-btn[data-view]').forEach(b =>
            b.classList.toggle('active', b.dataset.view === view));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        this.currentView = view;

        if (view === 'home') this.updateHome();
        else if (view === 'study') {
            Study.reset();
            Study.populateFilters();
        } else if (view === 'fillin') {
            FillIn.reset();
            FillIn.populateFilters();
        } else if (view === 'browse') {
            Browse.populateFilters();
            Browse.render();
        } else if (view === 'quiz') {
            Quiz.populateFilters();
            document.getElementById('qSetup').style.display = 'block';
            document.getElementById('qActive').style.display = 'none';
            document.getElementById('qResults').style.display = 'none';
        } else if (view === 'insights') {
            Analyst.init();
        }
    },

    // ─── File Loading ───────────────────────────────────────

    bindFileLoader() {
        const input = document.getElementById('fileInput');
        document.getElementById('loadDeckBtn').addEventListener('click', () => input.click());
        input.addEventListener('change', e => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = ev => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        const name = data.meta?.class || file.name.replace('.json', '');
                        Storage.addDeck(name, data);
                        Cards.loadFromStorage();
                        this.refreshAll();
                        console.log(`Loaded: ${name} (${data.cards?.length || 0} cards)`);
                    } catch (err) {
                        alert('Error: ' + err.message);
                    }
                };
                reader.readAsText(file);
            });
            input.value = '';
        });
    },

    // ─── Home Dashboard ─────────────────────────────────────

    updateHome() {
        const stats = Cards.getStats();
        document.getElementById('statTotal').textContent = stats.total;
        document.getElementById('statDue').textContent = stats.due;
        document.getElementById('statMastered').textContent = stats.mastered;

        const decks = Storage.getDecks();
        const list = document.getElementById('decksList');

        if (Object.keys(decks).length === 0) {
            list.innerHTML = `<div class="empty-msg">
                <p>No decks loaded yet</p>
                <button class="btn" onclick="document.getElementById('fileInput').click()">Load a Deck</button>
            </div>`;
            return;
        }

        list.innerHTML = Object.entries(decks).map(([name, deck]) => {
            const n = deck.cards?.length || 0;
            const ch = deck.meta?.chapters?.length > 0 ? `Ch. ${deck.meta.chapters.join(', ')}` : '';
            const types = [...new Set((deck.cards || []).map(c => c.type).filter(Boolean))];
            const typeTags = types.slice(0, 4).map(t => `<span class="tag type">${t}</span>`).join('');

            return `<div class="deck-card">
                <div class="deck-info">
                    <h3>${name}</h3>
                    <span class="deck-sub">${n} cards${ch ? ' · ' + ch : ''}</span>
                    ${typeTags ? `<div class="deck-types">${typeTags}</div>` : ''}
                </div>
                <div class="deck-actions">
                    <button class="btn sm" onclick="App.studyDeck('${name}')">Study</button>
                    <button class="btn sm secondary" onclick="App.fillInDeck('${name}')">Fill-in</button>
                    <button class="btn sm danger" onclick="App.deleteDeck('${name}')">Delete</button>
                </div>
            </div>`;
        }).join('');
    },

    studyDeck(name) {
        this.switchView('study');
        document.getElementById('sDeck').value = name;
        document.getElementById('sDeck').dispatchEvent(new Event('change'));
    },

    fillInDeck(name) {
        this.switchView('fillin');
        document.getElementById('fDeck').value = name;
        document.getElementById('fDeck').dispatchEvent(new Event('change'));
    },

    deleteDeck(name) {
        if (!confirm(`Delete "${name}"?`)) return;
        Storage.removeDeck(name);
        Cards.loadFromStorage();
        this.refreshAll();
    },

    refreshAll() {
        this.updateHome();
        Study.populateFilters();
        FillIn.populateFilters();
        Browse.populateFilters();
        Browse.render();
        Quiz.populateFilters();
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
