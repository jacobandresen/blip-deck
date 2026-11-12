# Agent guide

Keep it tight: plain functions, no layers. `src/controller.js` is the input layer, `src/deck.js` the element and the
stick, `src/index.js` the globals; `blip-deck.css` styles the deck only (page dressing lives in the pages).

- Every change keeps `npm test` at 100% line, branch and function coverage; test through the DOM (happy-dom).
- `npm run build` after a change under `src/`, and commit `dist/blip-deck.js`.
- blip (`node tools/sync_deck.mjs`) and breadbin (`node tools/blip-deck/sync.mjs`) copy the build; check both after a
  change to the element's markup, its attributes or the CSS. Do not publish or push unless asked.
