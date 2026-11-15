# Agent guide

Keep it small and plain: `src/deck.js` is the element, `src/gate.js` the stick's arithmetic, `src/blip-deck.css` its
look, `src/index.js` defines it. The deck knows nothing of the pages that use it: no game names, no page styles,
no globals. Its contract is attributes in, `blip-input` events out, `press()`, `release()`, `labels`, `tuning`.

- `npm test` stays at 100% line, branch and function coverage (happy-dom); test through the element.
- `npm run test:browser` after a change to the look: every combination must fit without overlaps.
- `npm run build` after a change under `src/`, and commit `dist/blip-deck.js`.
- A release is a new tag (never move one). Do not publish or push unless asked.
