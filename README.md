# ESPN Video Desk — interactive prototype

A clickable prototype of the **ESPN Video Watch Dashboard** PRD: a personal video "operating system" for weekly viewing assignments, live games, transcripts, and timestamped AI research.

## Run it

No build step or dependencies. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000   # then visit http://localhost:8000
```

State (assignment progress, notes, clips, chat, settings) is saved in `localStorage`. Use **Settings → Reset demo data** to start over.

## What's implemented

| PRD area | Where |
|---|---|
| Live Now banner (§10, §47): ticking clocks, score updates, filters (All / My sports / Assigned / network), hide scores, compact mode | Top of every page, plus **Live** page |
| Refresh ESPN Now (§23, §43, §52, §68): progressive step-by-step refresh, receipt, "New since last refresh", `R` shortcut | Top bar |
| Home (§11): weekly progress, due next, change log, Daily ESPN Brief with citations, continue watching, relevant videos | **Home** |
| Assignments (§12, §48): List, Cards, Kanban (drag to change status), Calendar, Sport and Priority views; snooze, reminders, due-date changes, priority, status | **Assignments** |
| Workflow automation (§44): play → In progress; 100% watched → needs summary; summary reviewed → Complete; overdue detection | Automatic |
| Reminders & notifications (§13, §69): default reminder schedule, custom and recurring reminders, smart alerts, notification center with per-category mutes | Bell icon, right rail, Settings |
| Player workspace (§14, §15, §29, §30): simulated playback with captions, speed, chapters, timeline markers, diarized transcript with speaker filter, search and low-confidence attribution, notes, bookmarks, virtual clips | Open any video |
| AI summaries (§16–18): Executive, Broadcaster, Interview (Q&A pairs, non-answers), Quote sheet, Tactical, Storyline, Timeline, Debate; every point cites a timestamp and records the model, template and review state | Player → AI summary |
| AI chat (§19, §40, §41): scope selectors, attributed answers, source chips that jump to the timestamp, retrieval trace, compare mode, answers about assignment status | **Chat**, Player → Ask |
| Library & search syntax (§21): `sport:`, `league:`, `team:`, `player:`, `speaker:`, `type:`, `tag:`, `assigned:`, `watched:`, `after:`, `before:` plus transcript hits | **Library** |
| Command palette (§22): `⌘K` / `Ctrl+K`; `↵` plays, `⇧↵` queues, `⌥↵` asks AI | Anywhere |
| "What did they say?" explorer (§31) | **What they said** |
| Sport taxonomy and landing pages (§3–7, §27) | Sidebar → sports, **More…** |
| Content trust labels (§67): Source transcript, User note, AI summary, AI inference, Live/unfinalized | Throughout |
| Rights states and failure states (§38, §53): market-restricted playback, transcript processing, AI unavailable | e.g. NHL highlights, F1 qualifying |

Press `?` for keyboard shortcuts (Space, J/K/L, M, N, S, Q, I/O, C, R, /).

## Notes

- **Demo data:** the leagues and teams are real, but every person, quote and transcript is made up. The "AI" is a deterministic keyword/concept retriever over the mock transcripts (`js/ai.js`), so answers are reproducible and always cite their sources. It is a stand-in for the RAG service described in PRD §20 and §36.
- **Files:** `js/data.js` (taxonomy and mock catalog), `js/core.js` (state, helpers), `js/ai.js` (retrieval, summaries, brief), `js/views.js` (page renderers), `js/app.js` (router, player, live ticker, refresh, palette), `css/styles.css`.
