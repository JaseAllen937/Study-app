// ============== AI Checker (Gemini) ==============
// Cloud AI via Google Gemini API — drop-in replacement for ollama-checker.js
// Same object name (Ollama) so nothing else needs to change

const Ollama = {
    API_KEY: 'AIzaSyBo0wsPW5evuBC4MzRHT1ADJVOW3qj91lg',
    MODEL: 'gemini-3.1-flash-lite-preview',
    TIMEOUT: 15000,
    isAvailable: null,
    _hintCache: {},

    _url() {
        return 'https://generativelanguage.googleapis.com/v1beta/models/' + this.MODEL + ':generateContent?key=' + this.API_KEY;
    },

    // ─── Connection Check ───────────────────────────────────

    async checkConnection() {
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

    // ─── Strip Hints ────────────────────────────────────────

    async stripHints(text, cardFront) {
        if (!text) return text;
        if (this._hintCache[text]) return this._hintCache[text];

        try {
            const cleaned = await this._call_gemini(
                'A French flashcard has this on the back:\n"' + text + '"\n\n' +
                'The French word on the front is: "' + cardFront + '"\n\n' +
                'The student sees your output and must guess the French word. ' +
                'Return ONLY the core English definition. Remove: French words, notes, pronunciation, phonetics, brackets, gender, singular/plural, examples. ' +
                'If it is a time expression or grammar concept, give a clear short English explanation. ' +
                'Return ONLY the cleaned text, nothing else.',
                false, 10000
            );

            if (cleaned && cleaned.length > 0 && cleaned.length < text.length * 3) {
                this._hintCache[text] = cleaned;
                return cleaned;
            }
        } catch (e) {
            console.warn('AI strip failed:', e.message);
        }

        // Fallback: hardcoded strip
        return text.split('\n').filter(function(l) {
            var t = l.trim().toLowerCase();
            return !t.startsWith('note:') && !t.startsWith('example:') && !t.startsWith('pronunciation:')
                && !t.startsWith('gender:') && !t.startsWith('singular:') && !t.startsWith('plural:')
                && !t.startsWith('examples:') && !t.startsWith('ex:') && !t.startsWith('notes:');
        }).map(function(l) {
            return l.replace(/\s*Note:.*$/i, '').replace(/\s*Pronunciation:.*$/i, '').replace(/\s*\[.*?\]/g, '').trim();
        }).filter(Boolean).join('\n').trim() || text;
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
                    '- Accept with or without article (le/la/les/un/une).\n' +
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
