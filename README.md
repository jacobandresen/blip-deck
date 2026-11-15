# blip-deck

An arcade control deck in one tag: a ball-top joystick or a d-pad, chunky buttons, one or two players. It plays
well with thumbs, a mouse or a pen, and it tells you what was pressed.

```html
<script src="https://cdn.jsdelivr.net/gh/jacobandresen/blip-deck@v2.0.0/dist/blip-deck.js"></script>

<blip-deck buttons='["FIRE","JUMP"]'></blip-deck>

<script>
  document.querySelector('blip-deck').addEventListener('blip-input', (e) => {
    console.log(e.detail.name, e.detail.down); // "up" true, "button1" false, …
  });
</script>
```

That is all of it: no stylesheet, images or fonts to fetch, nothing to wire up. The deck draws itself in its own
shadow root, so page styles cannot break it.

## Attributes

| Attribute  | Values                    | Default    |                                                         |
|------------|---------------------------|------------|---------------------------------------------------------|
| `controls` | `stick`, `pad`            | `stick`    | a joystick or a d-pad                                   |
| `buttons`  | JSON list of 1–2 legends  | `[""]`     | `'["FIRE","JUMP"]'`; `""` draws a button with no legend |
| `seats`    | `1`, `2`                  | `1`        | stations on the panel                                   |
| `solo`     | boolean                   | off        | station two is drawn but idle (nobody sits there)       |
| `layout`   | `upright`, `landscape`    | `upright`  | a panel under the screen, or controls in its gutters    |

In landscape the deck draws no panel: give it the screen (`position: fixed; inset: 0`) and it puts the controls
in the corners, letting every other touch through to the game.

## Events and methods

- **`blip-input`** fires on every change, with `detail: { name, down }`. Names are `up`, `down`, `left`, `right`,
  `button1`, `button2`, and the same with a `p2` prefix for station two (`p2up`, `p2button1`).
- **`press(name, down)`** lights a control without firing: mirror the keyboard or a gamepad on the deck.
- **`release()`** lets go of everything held, firing the releases (when the game pauses, say).
- **`tuning`** sets the stick's feel: `{ engage: 16, release: 9, hyst: 8, maxR: 46 }` (pixels and degrees).

## Accessibility and languages

Every station, stick, arm and button carries a role and a label, and buttons report `aria-pressed`. Labels are
English until you hand the deck your own: `deck.labels = { player: 'Spieler {n}', stick: 'Steuerknüppel', pad:
'Steuerkreuz', button: 'Knopf {n}', up: 'Hoch', down: 'Runter', left: 'Links', right: 'Rechts' }`. The legends
are yours already: they are what you pass in `buttons`.

## Styling

Set these on the element: `--blip-deck-cap` (button size), `--blip-deck-tilt` (24deg), `--blip-deck-panel`,
`--blip-deck-ball`, `--blip-deck-button1`, `--blip-deck-button2`, `--blip-deck-p2-button2`. For more, style the
parts: `blip-deck::part(panel)`, `::part(station)`, `::part(stick)`, `::part(dpad)`, `::part(buttons)` (a station's
buttons) and `::part(button)`. Anything
you put inside the element lies on the panel, leaning with it: position it yourself (a lamp, a dial).

## Develop

```sh
npm install
npm test               # the gate and the element on happy-dom, at 100% coverage
npm run test:browser   # every combination drawn in Chromium at phone to desktop widths: nothing overlaps
npm run build          # dist/blip-deck.js, the one file a page loads
```

Open `index.html` for every combination at once. A release is a new tag (`v2.0.1`); jsDelivr serves the built
file from it.

## Licence

MIT.
