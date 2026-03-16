# Study App — French Flashcard System

## Features
- **Study Mode** — Flashcards with flip, drill/spaced repetition, front↔back direction
- **Fill-in-the-Blank** — Type answers, AI checks them with Google Gemini
- **Quiz** — Multiple choice and true/false
- **Browse** — Search and view all cards
- **Insights** — View topics, filter by type, expand to see cards
- **AI Checking** — Gemini grades answers with synonym support
- **AI Hint Stripping** — Removes notes/pronunciation in Back→Front mode
- **Must Get Right** — Missed cards return until correct
- **Multi-select Type Pills** — Filter by multiple card types at once
- **Expandable Topics** — Click ▶ to see all cards in a topic

## Deploy to GitHub Pages (free)

1. Go to https://github.com → New Repository → name it `study-app` → Public → Create
2. Click "uploading an existing file"
3. Drag ALL files from this folder into the upload area:
   - `index.html`
   - `css/styles.css`
   - `js/storage.js`
   - `js/cards.js`
   - `js/ollama-checker.js`
   - `js/study.js`
   - `js/fillin.js`
   - `js/browse.js`
   - `js/quiz.js`
   - `js/analyst.js`
   - `js/app.js`
4. Commit changes
5. Go to Settings → Pages → Source: "Deploy from a branch" → Branch: main → Save
6. Wait 1-2 minutes, your site is live at: `https://YOUR-USERNAME.github.io/study-app`

## Loading Decks
- Click "+ Load Deck" and select a JSON flashcard file
- Deck data is saved in each student's browser (localStorage)
- Each person's progress is separate and private

## AI Features
- Toggle "AI Checking" in Fill-in mode to enable Gemini grading
- In Back→Front mode, AI automatically strips hints from card text
- Works from any browser — no local install needed
- Uses Google Gemini 3.1 Flash-Lite (free tier: 30 req/min)

## API Key
The Gemini API key is in `js/ollama-checker.js`. 
Set a spending limit at https://aistudio.google.com to prevent unexpected charges.

## Local Development
```
cd study-app
python3 -m http.server 8000
```
Open http://localhost:8000
