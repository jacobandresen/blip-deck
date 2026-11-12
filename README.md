# blip-deck

An arcade control deck as a web component, built with [Lit](https://lit.dev): two stations, each a ball-top
joystick and a game pad with two caps, and one input layer for touch, mouse, keyboard and gamepad. It is the deck of
[Blip Arcade](https://github.com/jacobandresen/blip) and the touch pad of
[breadbin](https://github.com/jacobandresen/breadbin).

```html
<link rel="stylesheet" href="blip-deck.css">
<div id="topbar" class="kiosk-bar">
  <blip-deck seats="2" buttons='[{"label":"JUMP"},{"label":"FIRE"}]'></blip-deck>
</div>
<script src="blip-deck.js"></script>
<script>
  BlipController.init({ canvas: document.querySelector('canvas'), buttons: [{ key: ' ', code: 'Space' }, { key: 'z', code: 'KeyZ' }] });
  BlipController.bindButtons(document.getElementById('fire-buttons'));
  BlipDeck.bindStick({ stick: document.getElementById('stick-base'), fire: document.getElementById('fire-buttons'),
    dirs: { up: 'up', down: 'down', left: 'left', right: 'right' } });
</script>
```

- `<blip-deck>`: attributes `buttons` (JSON `[{ label }]`, one or two), `cap-label`, `seats` (1 or 2). It renders into
  its own light DOM, so the page's CSS reaches it, and builds its parts as soon as it is connected: `#stick-base`,
  `#fire-buttons`, `#snes-pad` and their `-p2` twins. Children you put inside stay after the stations. Caps and arms
  carry `data-blip="<logical name>"`. It sets `data-caps`, `data-players` and `data-seats` on `<html>` (removed with
  it); the page sets `data-layout` (`upright` or `landscape`), `data-controls` (`stick` or `pad`) and `data-has-touch`.
- `BlipController`: `init(opts)`, `set(name, down)`, `releaseAll()`, `bindButtons(root)`, `bindDpad(pad, { names })`,
  `bindDial(el, opts)`, `bindKeyboard()`, `bindGamepad(poll)`, `registerVisual(root)`. Names are `up` … `right`,
  `button1` … `button4`, `p2up` … `p2button4`, `start`, `select`; a held name becomes a key event on `opts.canvas`.
  Options are documented on `init` in `src/controller.js`.
- `BlipDeck.bindStick(station, opts)` drives a stick with an 8-way gate; `BlipDeck.lean(stick, x, y)` leans its ball.

The same names are exported from `src/index.js` for bundlers.

## Build and test

```sh
npm install
npm run build   # dist/blip-deck.js: src/ and lit in one classic script (esbuild)
npm test        # node:test on happy-dom; fails below 100% line, branch or function coverage
```

`dist/` is committed: blip and breadbin copy `dist/blip-deck.js` and `blip-deck.css` with their sync scripts
(`tools/sync_deck.mjs`, `tools/blip-deck/sync.mjs`).

## Licence

MIT. The bundle includes Lit (BSD-3-Clause).
