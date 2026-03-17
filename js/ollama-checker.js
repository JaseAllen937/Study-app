// ============== AI Checker (Gemini) ==============
// Reads API key from localStorage — never stored in source code

const Ollama = {
    MODEL: 'gemini-3.1-flash-lite-preview',
    TIMEOUT: 15000,
    isAvailable: null,
    _hintCache: {},

    _getKey() {
        return localStorage.getItem('gemini_api_key') || '';
    },

    _url() {
        return 'https://generativelanguage.googleapis.com/v1beta/models/' + this.MODEL + ':generateContent?key=' + this._getKey();
    },

    // ─── Connection Check ───────────────────────────────────

    async checkConnection() {
        if (!this._getKey()) {
            this.isAvailable = false;
            return { ok: false, reason: 'No API key set. Click ⚙ to enter your Gemini key.' };
        }
        try {
            const res = await fetch(this._url(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Say ok' }] }],
                    generationConfig: { maxOutputTokens: 5 }
                }),
                signal: AbortSignal.timeout(5000)
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                this.isAvailable = false;
                return { ok: false, reason: err.error?.message || 'API error ' + res.status };
            }
            this.isAvailable = true;
            return { ok: true };
        } catch (e) {
            this.isAvailable = false;
            return { ok: false, reason: 'Cannot reach Gemini API' };
        }
    },

    // ─── Gemini Call Helper ──────────────────────────────────

    async _call_gemini(prompt, json, timeout) {
        if (!this._getKey()) throw new Error('No API key');

        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 300 }
        };
        if (json) body.generationConfig.responseMimeType = 'application/json';

        const res = await fetch(this._url(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeout || this.TIMEOUT)
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error?.message || 'API error ' + res.status);
        }

        const data = await res.json();
        return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    },

    // ─── Check Answer ───────────────────────────────────────

    async checkAnswer(userAnswer, correctAnswer, question, direction) {
        if (!userAnswer.trim()) {
            return { isCorrect: false, confidence: 100, feedback: 'No answer provided', source: 'fallback' };
        }

        var cleaned = userAnswer.trim().replace(/[^a-zA-ZÀ-ÿ0-9\s]/g, '').trim();
        if (cleaned.length < 2) {
            return { isCorrect: false, confidence: 100, feedback: '"' + userAnswer + '" is not a valid answer.', source: 'fallback' };
        }

        try {
            var prompt;

            if (direction === 'front') {
                prompt = 'Grade this French-to-English flashcard answer.\n\n' +
                    'French shown: "' + question + '"\n' +
                    'Expected English: "' + correctAnswer + '"\n' +
                    'Student typed: "' + userAnswer + '"\n\n' +
                    'RULES:\n' +
                    '- Student must answer in ENGLISH.\n' +
                    '- Be LENIENT with synonyms: "noon"/"12 pm"/"midday" all correct for "midi". ' +
                    '"midnight"/"12 am" all correct for "minuit". ' +
                    '"wednesday" is correct for "mercredi". ' +
                    '"15 minutes before"/"quarter to"/"quarter til" all correct for "moins le quart". ' +
                    '"half past"/"30 minutes after" all correct for "et demi(e)".\n' +
                    '- If core meaning is captured, mark CORRECT.\n' +
                    '- "wednesday", "midnight", "noon" are ENGLISH words, not French.\n' +
                    '- Only WRONG if meaning is actually wrong or they wrote French back.\n\n' +
                    'JSON only: {"isCorrect": true/false, "confidence": 0-100, "feedback": "brief reason"}';
            } else {
                prompt = 'Grade this English-to-French flashcard answer.\n\n' +
                    'English shown: "' + question + '"\n' +
                    'Expected French: "' + correctAnswer + '"\n' +
                    'Student typed: "' + userAnswer + '"\n\n' +
                    'RULES:\n' +
                    '- Student must answer in FRENCH.\n' +
                    '- Must have correct article (le/la/les/un/une).\n' +
                    '- Accept minor typos and missing accents.\n' +
                    '- Only WRONG if they wrote English or completely wrong French word.\n\n' +
                    'JSON only: {"isCorrect": true/false, "confidence": 0-100, "feedback": "brief reason"}';
            }

            var raw = await this._call_gemini(prompt, true, 12000);
            var parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
            return {
                isCorrect: Boolean(parsed.isCorrect),
                confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 50)),
                feedback: String(parsed.feedback || ''),
                source: 'ai'
            };
        } catch (e) {
            console.warn('Gemini check failed:', e.message);
            var norm = function(s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').trim(); };
            var ok = norm(userAnswer) === norm(correctAnswer);
            return { isCorrect: ok, confidence: ok ? 90 : 85, feedback: ok ? 'Match!' : 'Expected: ' + correctAnswer, source: 'fallback' };
        }
    }
};

// ─── API Key UI Helper ──────────────────────────────────
function saveApiKey() {
    const input = document.getElementById('apiKeyInput');
    if (!input) return;
    const key = input.value.trim();
    if (key) {
        localStorage.setItem('gemini_api_key', key);
        input.value = '';
        document.getElementById('apiKeyStatus').textContent = '✓ Key saved';
        document.getElementById('apiKeyStatus').style.color = '#22c55e';
    }
}

function clearApiKey() {
    localStorage.removeItem('gemini_api_key');
    document.getElementById('apiKeyStatus').textContent = 'Key cleared';
    document.getElementById('apiKeyStatus').style.color = '#f87171';
}

// Show current status on page load
document.addEventListener('DOMContentLoaded', () => {
    const el = document.getElementById('apiKeyStatus');
    if (el) {
        if (localStorage.getItem('gemini_api_key')) {
            el.textContent = '✓ Key is set';
            el.style.color = '#22c55e';
        } else {
            el.textContent = 'No key set';
            el.style.color = '#888';
        }
    }
});
