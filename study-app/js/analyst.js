// ============== Analyst (Insights) ==============
// Two features: multi-select type pills + expandable topic rows

const Analyst = {
    sel: [],   // selected types
    open: {},  // which topics are open: { topicName: true }

    init() {
        this.render();
    },

    render() {
        var pills = document.getElementById('iTypePills');
        var list = document.getElementById('iTopicList');
        if (!pills || !list) return;

        var allCards = Cards.all;
        if (allCards.length === 0) {
            pills.innerHTML = '';
            list.innerHTML = '<p style="color:#888;padding:20px;text-align:center">No cards loaded yet.</p>';
            return;
        }

        // Get all types
        var types = Cards.getTypes();

        // Render type pills
        var ph = '';
        for (var i = 0; i < types.length; i++) {
            var t = types[i];
            var on = this.sel.indexOf(t) >= 0;
            ph += '<button class="pill' + (on ? ' active' : '') + '" onclick="Analyst.toggle(\'' + t.replace(/'/g, "\\'") + '\')">' + t + '</button>';
        }
        pills.innerHTML = ph;

        // Group cards by topic, filtered by selected types
        var groups = {};  // { topic: { type, cards: [] } }
        for (var i = 0; i < allCards.length; i++) {
            var c = allCards[i];
            // If types selected, skip cards not matching
            if (this.sel.length > 0 && this.sel.indexOf(c.type) < 0) continue;
            var tp = c.topic || 'Other';
            if (!groups[tp]) groups[tp] = { type: c.type, cards: [] };
            groups[tp].cards.push(c);
        }

        var topicNames = Object.keys(groups).sort();

        if (topicNames.length === 0) {
            list.innerHTML = '<p style="color:#888;padding:20px;text-align:center">No topics match.</p>';
            return;
        }

        // Get study performance data
        var perf = this._getPerf();

        // Render topics
        var h = '';
        for (var i = 0; i < topicNames.length; i++) {
            var name = topicNames[i];
            var group = groups[name];
            var isOpen = this.open[name] === true;
            var safe = name.replace(/'/g, "\\'").replace(/"/g, '&quot;');

            h += '<div class="i-topic" style="margin-bottom:6px">';

            // Header row — clickable
            h += '<div onclick="Analyst.tap(\'' + safe + '\')" style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#1a1a2e;border:1px solid #2a2a4a;border-radius:' + (isOpen ? '10px 10px 0 0' : '10px') + ';cursor:pointer;user-select:none">';
            h += '<span style="color:#888;font-size:0.75rem;width:14px">' + (isOpen ? '▼' : '▶') + '</span>';
            h += '<span style="color:#ddd;font-size:0.9rem;flex:1">' + name + '</span>';
            h += '<span style="color:#666;font-size:0.8rem">' + group.cards.length + ' cards</span>';
            h += '</div>';

            // Card list — only if open
            if (isOpen) {
                h += '<div style="background:#141428;border:1px solid #2a2a4a;border-top:none;border-radius:0 0 10px 10px;padding:4px 0">';
                var cards = group.cards.sort(function(a, b) {
                    var am = (perf[a.id] && perf[a.id].misses) || 0;
                    var bm = (perf[b.id] && perf[b.id].misses) || 0;
                    return bm - am;
                });
                for (var j = 0; j < cards.length; j++) {
                    var card = cards[j];
                    var p = perf[card.id];
                    var status, color;
                    if (!p) {
                        status = 'not studied';
                        color = '#555';
                    } else if (p.misses === 0) {
                        status = '✓ mastered';
                        color = '#10b981';
                    } else {
                        status = p.misses + '× missed';
                        color = '#ef4444';
                    }
                    h += '<div style="display:flex;justify-content:space-between;padding:6px 14px 6px 36px;font-size:0.85rem">';
                    h += '<span style="color:#ccc">' + this._esc(card.front) + '</span>';
                    h += '<span style="color:' + color + ';font-size:0.8rem;white-space:nowrap;margin-left:10px">' + status + '</span>';
                    h += '</div>';
                }
                h += '</div>';
            }

            h += '</div>';
        }
        list.innerHTML = h;
    },

    // Toggle a type pill
    toggle(type) {
        var idx = this.sel.indexOf(type);
        if (idx >= 0) this.sel.splice(idx, 1);
        else this.sel.push(type);
        this.render();
    },

    // Toggle a topic open/closed
    tap(topic) {
        this.open[topic] = !this.open[topic];
        this.render();
    },

    // Get per-card study performance from session history
    _getPerf() {
        var sessions = Storage.getHistory();
        var perf = {};
        for (var i = 0; i < sessions.length; i++) {
            var cards = sessions[i].cards || [];
            for (var j = 0; j < cards.length; j++) {
                var c = cards[j];
                if (!perf[c.id]) perf[c.id] = { misses: 0, attempts: 0, gotRight: false };
                perf[c.id].misses += (c.misses || 0);
                perf[c.id].attempts += (c.attempts || 0);
                if (c.gotRight) perf[c.id].gotRight = true;
            }
        }
        return perf;
    },

    _esc(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
};
