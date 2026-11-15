// <blip-deck>: an arcade control deck. Each station is a joystick (or a d-pad) and its buttons; pressing them fires
// `blip-input` events. Nothing else is assumed of the page: the deck brings its own look and needs no wiring.
//
//   <blip-deck controls="stick" seats="2" solo buttons='["FIRE","JUMP"]'></blip-deck>
//   deck.addEventListener('blip-input', (e) => console.log(e.detail.name, e.detail.down));
//
// Names: up, down, left, right, button1, button2 for station one; p2up … p2button2 for station two.
import STYLE from './blip-deck.css'; // inlined as text by the build (tools/build.mjs) and the tests (test/css.js)
import { gate, cross } from './gate.js';

const DIRS = ['up', 'right', 'down', 'left'];
/** English text for screen readers; set deck.labels to translate ({n} is the player or button number). */
export const LABELS = { player: 'Player {n}', stick: 'Joystick', pad: 'D-pad', button: 'Button {n}',
  up: 'Up', down: 'Down', left: 'Left', right: 'Right' };
const SLOP = 12; // px around a button that still presses it: thumbs are wider than they look
const MIN_PRESS = 20; // ms a press lasts at least: a game that reads input once a frame sees even the quickest tap
// The cross: a rounded plus in a 100-unit box.
const PLUS = 'M38 2H62Q68 2 68 8V29Q68 32 71 32H92Q98 32 98 38V62Q98 68 92 68H71Q68 68 68 71V92Q68 98 62 98H38Q32 98 32 92V71Q32 68 29 68H8Q2 68 2 62V38Q2 32 8 32H29Q32 32 32 29V8Q32 2 38 2Z';

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const prefix = (who) => (who ? 'p2' : '');

export class BlipDeck extends HTMLElement {
  static observedAttributes = ['buttons', 'seats', 'solo'];

  #labels = LABELS;
  #contacts = new Map(); // touch or pointer id -> { kind, who, el, gate?, names }
  #held = new Map(); // names the deck's own controls hold -> when they went down
  #shown = new Set(); // names lit by press(): the keyboard or a gamepad, mirrored
  /** Stick feel ({ engage, release, hyst, maxR }, see gate.js). */
  tuning = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.addEventListener('touchstart', this.#onTouch, { passive: false });
    for (const type of ['touchmove', 'touchend', 'touchcancel']) this.addEventListener(type, this.#onTouch);
    this.addEventListener('pointerdown', this.#onPointer);
    for (const type of ['pointermove', 'pointerup', 'pointercancel']) this.addEventListener(type, this.#onPointer);
    this.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  connectedCallback() { this.#render(); }
  disconnectedCallback() { this.release(); }
  attributeChangedCallback() { if (this.isConnected) this.#render(); }

  get labels() { return this.#labels; }
  set labels(text) {
    this.#labels = { ...LABELS, ...text };
    if (this.isConnected) this.#render();
  }

  /** Light a control without firing (input that reached the game another way). */
  press(name, down) {
    if (down) this.#shown.add(name);
    else this.#shown.delete(name);
    this.#paint();
  }

  /** Let go of everything the deck holds, at once, firing the releases. */
  release() {
    this.#contacts.clear();
    this.#update(true);
    this.#shown.clear();
    this.#paint();
  }

  #buttons() {
    try {
      const list = JSON.parse(this.getAttribute('buttons'));
      if (Array.isArray(list) && list.length) return list.slice(0, 2).map(String);
    } catch {}
    return [''];
  }

  #render() {
    this.release();
    const t = this.#labels, n = (text, i) => escape(text.replace('{n}', i + 1));
    const buttons = this.#buttons(), seats = this.getAttribute('seats') === '2' ? 2 : 1;
    const station = (who) => {
      const p = prefix(who), idle = who === 1 && this.hasAttribute('solo');
      const arms = DIRS.map((d) => `<span class="arm ${d}" data-name="${p}${d}" role="button" aria-label="${escape(t[d])}"></span>`).join('');
      const caps = buttons.map((label, i) => `<span class="cap" part="button" data-name="${p}button${i + 1}" role="button"
        aria-label="${label ? escape(label) : n(t.button, i)}">${label && !idle ? `<span class="legend" aria-hidden="true">${escape(label)}</span>` : ''}</span>`).join('');
      return `<div class="station" part="station" data-who="${who}" role="group" aria-label="${n(t.player, who)}"${idle ? ' aria-disabled="true"' : ''}><div class="row">
        <div class="stick" part="stick" data-kind="stick" role="group" aria-label="${escape(t.stick)}">
          <span class="washer"></span><span class="lever"><span class="shaft"></span><span class="ball"></span></span>
        </div>
        <div class="dpad" part="dpad" data-kind="dpad" role="group" aria-label="${escape(t.pad)}">
          <svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="plastic" x2="0" y2="1"><stop offset="0"/><stop offset=".55"/><stop offset="1"/></linearGradient></defs><path d="${PLUS}"/><circle cx="50" cy="50" r="7"/></svg>${arms}
        </div>
        <div class="caps" part="buttons">${caps}</div>
      </div></div>`;
    };
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><div class="panel" part="panel">${station(0)}${seats === 2 ? station(1) : ''}<slot></slot></div>`;
    this.#paint();
  }

  // ---- Input: every finger, mouse or pen is a contact that holds one control ----

  #onTouch = (e) => {
    if (e.type === 'touchstart') {
      e.preventDefault(); // no zoom, scroll or emulated mouse from the deck
      for (const t of e.changedTouches) this.#start(t.identifier, t.clientX, t.clientY);
    }
    const live = new Set();
    for (const t of e.touches) {
      live.add(t.identifier);
      this.#move(t.identifier, t.clientX, t.clientY);
    }
    // The touch list is the truth: iOS cancels touches mid-gesture, and lifts are only seen through it.
    for (const id of this.#contacts.keys()) if (typeof id === 'number' && !live.has(id)) this.#contacts.delete(id);
    this.#update();
  };

  #onPointer = (e) => {
    if (e.pointerType === 'touch') return; // touches are handled above
    const id = 'p' + e.pointerId;
    if (e.type === 'pointerdown') {
      e.preventDefault();
      try { this.setPointerCapture(e.pointerId); } catch {} // a pointer the browser did not make cannot be captured
      this.#start(id, e.clientX, e.clientY);
    } else if (e.type === 'pointermove') this.#move(id, e.clientX, e.clientY);
    else this.#contacts.delete(id);
    this.#update();
  };

  #start(id, x, y) {
    const el = this.#hit(x, y, '.stick, .dpad, .cap');
    if (!el) return;
    const kind = el.dataset.kind || 'cap';
    const who = Number(el.closest('.station').dataset.who);
    this.#contacts.set(id, { kind, who, el, gate: kind === 'stick' && gate(x, y, this.tuning), names: [] });
    this.#move(id, x, y);
  }

  #move(id, x, y) {
    const c = this.#contacts.get(id);
    if (!c) return;
    const p = prefix(c.who);
    if (c.kind === 'stick') c.names = c.gate(x, y).map((d) => p + d);
    else if (c.kind === 'dpad') {
      const r = c.el.getBoundingClientRect();
      c.names = cross((x - r.left) / (r.width / 2) - 1, (y - r.top) / (r.height / 2) - 1).map((d) => p + d);
    } else {
      // a finger may slide from one button to the next
      const cap = this.#hit(x, y, `.station[data-who="${c.who}"] .cap`);
      c.names = cap ? [cap.dataset.name] : [];
    }
  }

  /** The visible control nearest to x, y (inside, or within SLOP of a button), on a station that is in play. */
  #hit(x, y, selector) {
    let best = null, bestD = Infinity;
    for (const el of this.shadowRoot.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width || el.closest('[aria-disabled]')) continue;
      const d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d < bestD && d <= (el.classList.contains('cap') ? SLOP : 0)) { best = el; bestD = d; }
    }
    return best;
  }

  /** Fire the difference between what the contacts hold now and what they held. A release comes MIN_PRESS after
   *  its press at the soonest, unless it is `forced`. */
  #update(forced = false) {
    const now = new Set([...this.#contacts.values()].flatMap((c) => c.names)), t = performance.now();
    const changes = [];
    for (const [name, since] of this.#held) {
      if (now.has(name)) continue;
      if (!forced && t - since < MIN_PRESS) setTimeout(() => this.#update(), MIN_PRESS - (t - since));
      else { this.#held.delete(name); changes.push([name, false]); }
    }
    for (const name of now) if (!this.#held.has(name)) { this.#held.set(name, t); changes.push([name, true]); }
    if (!changes.length) return;
    this.#paint();
    for (const [name, down] of changes)
      this.dispatchEvent(new CustomEvent('blip-input', { detail: { name, down }, bubbles: true, composed: true }));
  }

  // ---- Output: lit buttons, pressed arms and a leaning stick ----

  #paint() {
    const lit = (name) => this.#held.has(name) || this.#shown.has(name);
    for (const el of this.shadowRoot.querySelectorAll('[data-name]')) el.setAttribute('aria-pressed', lit(el.dataset.name));
    for (const st of this.shadowRoot.querySelectorAll('.station')) {
      const p = prefix(Number(st.dataset.who)), on = (d) => (lit(p + d) ? 1 : 0);
      let x = on('right') - on('left'), y = on('down') - on('up');
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; } // a diagonal leans as far as a straight push
      st.style.setProperty('--dx', x);
      st.style.setProperty('--dy', y);
    }
  }
}
