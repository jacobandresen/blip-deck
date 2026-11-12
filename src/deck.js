// <blip-deck>: the control deck, two stations each an arcade stick and a pad with two caps (the page's
// <html data-controls> shows one of them). Light DOM, so the page styles it (blip-deck.css) and finds its parts.
//
//   <blip-deck seats="2" cap-label="FIRE" buttons='[{"label":"JUMP"},{"label":"PUNCH"}]'>
//
// buttons [{ label }]: a game's one or two actions; without them the caps carry no legend and A / B both fire.
// cap-label: the legend of a button without one. seats 1 or 2: station two is drawn either way, live only with 2.
// Caps and arms carry data-blip="<logical name>" (up … button1, p2up … p2button2) for BlipController.
// Children the page puts inside (Rally's dials) stay after the stations.
import { LitElement, html, nothing } from 'lit';
import { BlipController } from './controller.js';

const PER_PLAYER = 2; // no game reads more than two caps a player
const STATIONS = [
  { id: '', dirs: ['up', 'right', 'down', 'left'], cap: 'button' },
  { id: '-p2', dirs: ['p2up', 'p2right', 'p2down', 'p2left'], cap: 'p2button' },
];
const ROOT_ATTRS = ['data-caps', 'data-players', 'data-seats'];

// The cross as one moulded part: a rounded plus, one gradient, a rim light and a shadow. Its arm segments are the
// touch targets and light up when pressed.
const PLUS = 'M38 2H62Q68 2 68 8V29Q68 32 71 32H92Q98 32 98 38V62Q98 68 92 68H71Q68 68 68 71V92Q68 98 62 98H38Q32 98 32 92V71Q32 68 29 68H8Q2 68 2 62V38Q2 32 8 32H29Q32 32 32 29V8Q32 2 38 2Z';
const cross = (id) => html`<svg class="snes-dp-body" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id=${'dpg' + id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="dp-s0"/><stop offset=".55" class="dp-s1"/><stop offset="1" class="dp-s2"/></linearGradient><filter id=${'dps' + id} x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.4" flood-color="#000" flood-opacity=".75"/></filter></defs><path d=${PLUS} fill=${`url(#dpg${id})`} filter=${`url(#dps${id})`}/><path class="dp-rim" d=${PLUS}/><circle class="dp-dimple" cx="50" cy="50" r="7"/></svg>`;

export class BlipDeckElement extends LitElement {
  static properties = { buttons: { type: Array }, capLabel: { attribute: 'cap-label' }, seats: { type: Number } };

  createRenderRoot() {
    this.renderOptions.renderBefore = this.firstChild;
    return this;
  }

  // The parts exist as soon as the deck is in the page, for the scripts that bind them.
  connectedCallback() {
    super.connectedCallback();
    this.classList.add('deck-panel');
    this.performUpdate();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const a of ROOT_ATTRS) document.documentElement.removeAttribute(a);
  }

  render() {
    const lettered = !!this.buttons, buttons = this.buttons || [{}], two = this.seats === 2;
    const specs = buttons.length < 2 ? [buttons[0], buttons[0]] : buttons;
    // The layout's names for this deck, which the CSS keys off: four caps, two stations, one or two seated.
    const root = document.documentElement;
    root.setAttribute('data-caps', '4');
    root.setAttribute('data-players', '2');
    if (two) root.removeAttribute('data-seats');
    else root.setAttribute('data-seats', '1');
    // A cap: live unless its station is unseated; named only for a game's buttons (else pad A / B both fire).
    const cap = (pad, st, who, i) => {
      const c = who && !two ? null : specs[i];
      const name = c && (lettered ? st.cap + (i + 1) : !who && pad ? 'button1' : null);
      const text = c && lettered ? c.label || this.capLabel || 'FIRE' : '';
      const cls = `${pad ? `snes-btn cap${i + 1}` : 'arcade-btn lettered'}${c ? '' : ' spare'}${buttons.length === 2 && i ? ' alt' : ''}`;
      const legend = text ? html`<small class="cap-legend" aria-hidden="true">${text}</small>` : nothing;
      return pad
        ? html`<button type="button" class=${cls} data-blip=${name || nothing} aria-label=${text || nothing}><span></span>${legend}</button>`
        : html`<div class=${cls} data-blip=${name || nothing} aria-label=${text || nothing}><span class="arcade-btn-cap"></span>${legend}</div>`;
    };
    const caps = (pad, st, who) => Array.from({ length: PER_PLAYER }, (_, i) => cap(pad, st, who, i));
    return html`${STATIONS.map((st, who) => html`<div class="deck-side" id=${'deck-p' + (who + 1)}><div class="stick-base" id=${'stick-base' + st.id}><div class="stick-boot"></div><div class="stick-handle"><div class="stick-shaft"></div><div class="stick-ball"></div></div></div><div class="fire-buttons four" id=${'fire-buttons' + st.id}>${caps(false, st, who)}</div></div>`)}${STATIONS.map((st, who) => html`<div class=${who ? 'snes-pad second' : 'snes-pad'} id=${'snes-pad' + st.id} aria-hidden="true"><div class="snes-shell"><div class="snes-dpad">${cross(st.id || '-p1')}${['up', 'right', 'down', 'left'].map((d, k) => html`<span class=${'snes-dp-seg dp-' + d} data-blip=${st.dirs[k]} data-blip-nopress></span>`)}</div><div class="snes-face four">${caps(true, st, who)}</div>${who ? nothing : html`<span class="snes-wordmark" aria-hidden="true">BLIP</span>`}</div></div>`)}`;
  }
}

/* The 8-way restrictor-gate joystick: a drag that starts on the stick leans it and holds its directions through
 * BlipController. The ball can project over the picture, so capture starts anywhere on the screen.
 * st: { stick, fire, dirs: { up, down, left, right } }; opts (all optional):
 *   zone      the element a drag must start on (default: the stick, or its station's half of the deck)
 *   split     two stations share the deck (opts.bar, default the stick's <blip-deck>), a half each; who: 0 or 1
 *   tuning    { engage, release, maxR, hyst } in pixels and degrees
 *   active()  false while the stick is not in use (the deck shows its pad)
 * Returns a function that stops listening. */
export function bindStick(st, opts = {}) {
  const base = st.stick, fire = st.fire, who = opts.who || 0, tuning = opts.tuning || {};
  if (!base) return () => {};
  const ENGAGE = tuning.engage ?? 16, RELEASE = tuning.release ?? 9, MAX_R = tuning.maxR ?? 46, HYST = tuning.hyst ?? 8;
  const GATE = { 0: ['up'], 45: ['up', 'right'], 90: ['right'], 135: ['down', 'right'], 180: ['down'],
    225: ['down', 'left'], 270: ['left'], 315: ['up', 'left'] };
  let activeId = null, engaged = false, lockDeg = null, pivot = null, pending = null, raf = 0, nextOk = 0;
  const want = {};

  function setLock(deg) {
    if (deg === lockDeg) return;
    lockDeg = deg;
    for (const dir of ['up', 'down', 'left', 'right']) {
      const on = deg !== null && GATE[deg].includes(dir);
      if (!!want[dir] !== on) { want[dir] = on; BlipController.set(st.dirs[dir], on); }
    }
  }
  function apply(e) {
    let dx = e.clientX - pivot.x, dy = e.clientY - pivot.y, dist = Math.hypot(dx, dy);
    if (dist > MAX_R) {
      // the centre follows a wandering thumb, so turning back acts at once
      const k = 1 - MAX_R / dist;
      pivot.x += dx * k; pivot.y += dy * k;
      dx = e.clientX - pivot.x; dy = e.clientY - pivot.y;
      dist = MAX_R;
    }
    engaged = dist > (engaged ? RELEASE : ENGAGE);
    if (!engaged) return setLock(null);
    const ang = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    const near = lockDeg !== null && Math.abs(((ang - lockDeg + 540) % 360) - 180) <= 22.5 + HYST;
    setLock(near ? lockDeg : (Math.round(ang / 45) % 8) * 45);
  }
  function release() {
    activeId = pivot = pending = null;
    engaged = false;
    cancelAnimationFrame(raf);
    raf = nextOk = 0;
    setLock(null);
    removeEventListener('pointermove', onMove, true);
    removeEventListener('pointerup', onEnd, true);
    removeEventListener('pointercancel', onEnd, true);
  }
  // On the stick or its raised ball; else on the station's half of the deck, short of its caps.
  function isStickTouch(e) {
    if (opts.zone) return opts.zone.contains(e.target);
    if (!base.getBoundingClientRect().width) return false;
    const b = base.querySelector('.stick-ball').getBoundingClientRect();
    if (base.contains(e.target) || (e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top && e.clientY <= b.bottom)) return true;
    if (opts.split) {
      const r = (opts.bar || base.closest('blip-deck')).getBoundingClientRect();
      if ((e.clientX < r.left + r.width / 2) !== (who === 0)) return false;
    }
    if (!fire) return true;
    const f = fire.getBoundingClientRect();
    return !e.target.closest?.('.fire-buttons') && !(f.width && e.clientX >= f.left - 6);
  }
  function flush() {
    raf = 0;
    const e = pending;
    pending = null;
    if (e) { nextOk = performance.now() + 8; apply(e); }
  }
  function onMove(e) {
    if (e.pointerId !== activeId) return;
    e.preventDefault();
    pending = e;
    if (performance.now() >= nextOk) flush();
    else if (!raf) raf = requestAnimationFrame(flush);
  }
  function onEnd(e) { if (e.type === 'pointercancel' || e.pointerId === activeId) release(); }
  function onDown(e) {
    if (opts.active && !opts.active()) return;
    if (activeId !== null) release();
    if (!isStickTouch(e)) return;
    e.preventDefault();
    activeId = e.pointerId;
    pivot = { x: e.clientX, y: e.clientY };
    addEventListener('pointermove', onMove, true);
    addEventListener('pointerup', onEnd, true);
    addEventListener('pointercancel', onEnd, true);
  }
  function onHidden() { if (document.hidden) release(); }
  addEventListener('pointerdown', onDown, true);
  addEventListener('blur', release);
  document.addEventListener('visibilitychange', onHidden);
  return () => {
    release();
    removeEventListener('pointerdown', onDown, true);
    removeEventListener('blur', release);
    document.removeEventListener('visibilitychange', onHidden);
  };
}

/** Lean a stick toward x, y (each -1, 0 or 1; a diagonal leans as far as a straight push). */
export function lean(stick, x, y) {
  if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  stick.style.setProperty('--dx', x);
  stick.style.setProperty('--dy', y);
}
