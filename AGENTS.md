# Agent guide

Keep it tight: plain functions, no layers. `src/controller.js` is the input layer, `src/deck.js` the element and the
stick, `src/index.js` the globals; `blip-deck.css` styles the deck only (page dressing lives in the pages).

- Every change keeps `npm test` at 100% line, branch and function coverage; test through the DOM (happy-dom).
- `npm run build` after a change under `src/`, and commit `dist/blip-deck.js`.
- blip and breadbin load a tagged build from jsDelivr; a release is a new tag (never move one), then the tag bumped
  in both. Check both after a change to the element's markup, its attributes or the CSS. Do not publish or push
  unless asked.
