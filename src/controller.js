// One input layer for the deck's caps and cross, a dial, the keyboard and a gamepad. Every source sets a logical name
// (up … right, button1 … button4, p2up … p2button4, start, select); a held name becomes a key event on the canvas.
// On touch screens the live touch list is the authority: iOS cancels pointers during multi-touch, so pointercancel is
// never a release.

const DIR = new Set(['up', 'down', 'left', 'right', 'p2up', 'p2down', 'p2left', 'p2right']);
const ARROW_NAME = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right' };
const GP_NAME = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Space: 'button1',
  KeyZ: 'button2', Start: 'start', Select: 'select' };
const ARMS = ['up', 'down', 'left', 'right'];

const cfg = { canvas: null, gate: null, onInput: null, onStart: null, onSelect: null, feedback: null, click: null };
let keymap = null;
const held = {}, injected = {}; // caps can share one physical key
const roots = [], targets = [], dials = [];
let rects = null;

function buildKeymap(buttons, extra) {
  const list = buttons && buttons.length ? buttons : [{ key: ' ', code: 'Space' }];
  const map = {};
  for (const n of ARMS) { const key = 'Arrow' + n[0].toUpperCase() + n.slice(1); map[n] = { key, code: key }; }
  list.forEach((b, i) => { map['button' + (i + 1)] = { key: b.key, code: b.code }; });
  map.button2 ??= map.button1; // a one-button game's two caps both fire
  for (const n in extra) if (extra[n]) map[n] = extra[n];
  return map;
}

// What a game declares wins over the arrows: where the arrows are player two's, ArrowUp lights player two's stick.
function nameForCode(code) {
  return Object.keys(keymap || {}).find((n) => keymap[n].code === code) || ARROW_NAME[code] || null;
}

function injectKey(spec, type) {
  if (!cfg.canvas || !spec) return;
  const count = injected[spec.code] || 0;
  if (type === 'keydown') {
    injected[spec.code] = count + 1;
    if (count) return;
  } else if (count > 1) {
    injected[spec.code] = count - 1;
    return;
  } else delete injected[spec.code];
  cfg.canvas.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, key: spec.key, code: spec.code }));
}

// select always leaves; everything else waits while the gate is shut (a coin wall).
const swallowed = (name) => name !== 'select' && !!(cfg.gate && cfg.gate());
const emitKey = (spec, type) => { if (type !== 'keydown' || !swallowed()) injectKey(spec, type); };
// A consumer's sound or haptic that throws (no audio) never stops input.
function click(kind) { try { cfg.click && cfg.click(kind); } catch {} }
function tick() { try { cfg.feedback && cfg.feedback(); } catch {} }

function reflect(name, down) {
  for (const root of roots) for (const el of root.querySelectorAll(`[data-blip~="${name}"]`)) el.classList.toggle('blip-pressed', down);
}

// opts.silent: light the deck only (the real key already reached the game); opts.silentClick: no click sound.
function set(name, down, opts = {}) {
  down = !!down;
  const edge = name === 'start' || name === 'select';
  if (!keymap || (!edge && !keymap[name]) || down === !!held[name]) return;
  held[name] = down;
  reflect(name, down);
  try { cfg.onInput && cfg.onInput(name, down); } catch {}
  if (swallowed(name)) return;
  if (edge) {
    if (!down) return;
    if (!opts.silent) { click('menu'); tick(); }
    const action = name === 'start' ? cfg.onStart : cfg.onSelect;
    if (action) action();
    return;
  }
  if (opts.silent) return;
  injectKey(keymap[name], down ? 'keydown' : 'keyup');
  if (down) { if (!opts.silentClick) click(DIR.has(name) ? 'dpad' : 'face'); tick(); }
}

function releaseAll() {
  for (const t of targets) { t.pend = false; t.up(); }
  for (const stop of dials) stop();
  for (const n in held) if (held[n]) set(n, false);
}

// A release waits a frame: iOS cancels every touch when a multi-touch gesture moves, then re-fires touchstart for
// the fingers still down.
function defer(t) {
  if (t.pend) return;
  t.pend = true;
  requestAnimationFrame(() => { if (t.pend) { t.pend = false; t.up(); } });
}
function edgeDist(r, x, y) {
  return Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
}
// Each touch belongs to the one control whose edge is nearest (0 inside, slop px outside still counts). Rects are
// read on touchstart and after a resize only: touchmove comes at up to 120 Hz a finger.
function syncTouches(list, fresh) {
  if (fresh || !rects || rects.length !== targets.length) rects = targets.map((t) => t.el.getBoundingClientRect());
  const hit = new Map();
  for (const touch of list) {
    const x = touch.clientX, y = touch.clientY;
    let best = -1, bestD = Infinity, bestC = Infinity;
    targets.forEach((t, i) => {
      const r = rects[i], d = edgeDist(r, x, y);
      if (!r.width || d > t.slop) return;
      const c = Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2));
      if (d < bestD || (d === bestD && c < bestC)) { bestD = d; bestC = c; best = i; }
    });
    if (best >= 0 && !hit.has(best)) hit.set(best, touch);
  }
  targets.forEach((t, i) => {
    if (!rects[i].width) return;
    if (hit.has(i)) { t.pend = false; t.down(hit.get(i), rects[i]); }
    else if (t.on()) defer(t);
  });
}
addEventListener('resize', () => { rects = null; });
for (const type of ['touchstart', 'touchmove', 'touchend', 'touchcancel'])
  document.addEventListener(type, (e) => syncTouches(e.touches, type === 'touchstart'), { passive: true });

// Mouse and pen: the pointer events themselves. Touch: the touch list above.
function bindPointer(el, down, move, up) {
  let pid = null;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    try { el.setPointerCapture(pid); } catch {}
    if (e.pointerType !== 'touch') down(e);
  });
  if (move) el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    e.preventDefault();
    if (e.pointerType !== 'touch') move(e);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
    el.addEventListener(type, (e) => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (e.pointerType !== 'touch') up();
    });
}

// Every [data-blip="<names>"] in root presses its names. data-blip-kind sets the click (shoulder, menu);
// data-blip-nopress only lights (the cross's arms, driven by bindDpad).
function bindButtons(root) {
  if (!root) return;
  registerVisual(root);
  for (const el of root.querySelectorAll('[data-blip]:not([data-blip-nopress])')) {
    const names = el.getAttribute('data-blip').split(/\s+/).filter(Boolean);
    const kind = el.getAttribute('data-blip-kind');
    const t = { el, slop: 12, pend: false, held: false, on: () => t.held };
    t.down = () => {
      if (t.held) return;
      t.held = true;
      if (kind) click(kind);
      for (const n of names) set(n, true, { silentClick: !!kind });
    };
    t.up = () => {
      if (!t.held) return;
      t.held = false;
      for (const n of names) set(n, false);
    };
    targets.push(t);
    bindPointer(el, t.down, null, t.up);
  }
}

// The cross: one pivot at its centre, four ways and a dead centre; toward a corner both axes engage.
// o.names maps each arm to a logical name (a second player's cross), o.dead is the dead share of the radius.
function bindDpad(pad, o = {}) {
  if (!pad) return;
  const dead = o.dead ?? 0.32;
  const names = o.names || { up: 'up', down: 'down', left: 'left', right: 'right' };
  const put = (n, on) => {
    set(names[n], on);
    pad.querySelector('.dp-' + n)?.classList.toggle('blip-pressed', on);
  };
  const calc = (e, r = pad.getBoundingClientRect()) => {
    const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    put('left', nx < -dead);
    put('right', nx > dead);
    put('up', ny < -dead);
    put('down', ny > dead);
    pad.classList.add('blip-touched');
  };
  const clear = () => {
    for (const n of ARMS) put(n, false);
    pad.classList.remove('blip-touched');
  };
  targets.push({ el: pad, slop: 14, pend: false, down: calc, up: clear, on: () => pad.classList.contains('blip-touched') });
  bindPointer(pad, calc, calc, clear);
}

// A spinner (Rally's paddle): turning past `dead` radians holds o.up or o.down, until the turn stops for idleMs or
// reverses; a press that hardly turns is a tap (o.tap key, o.onTap). o.onInteract fires on every grab.
function bindDial(dial, o = {}) {
  if (!dial) return;
  const dead = o.dead ?? 0.018, idleMs = o.idleMs ?? 70;
  let last = null, pid = null, total = 0, acc = 0, idle = null, rect = null;
  const hold = { up: false, down: false };
  const angleAt = (x, y) => Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2));
  const dir = (up, down) => {
    for (const [n, want] of [['up', up], ['down', down]]) {
      if (want === hold[n]) continue;
      hold[n] = want;
      if (want) click('dpad');
      emitKey(o[n], want ? 'keydown' : 'keyup');
    }
  };
  const clearIdle = () => { clearTimeout(idle); idle = null; };
  const stop = () => { clearIdle(); dir(false, false); dial.classList.remove('active'); last = pid = rect = null; acc = 0; };
  dials.push(stop);
  dial.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (pid !== null) return;
    if (o.onInteract) o.onInteract();
    pid = e.pointerId;
    try { dial.setPointerCapture(pid); } catch {}
    rect = dial.getBoundingClientRect();
    last = angleAt(e.clientX, e.clientY);
    total = 0;
    dial.classList.add('active');
  });
  dial.addEventListener('pointermove', (e) => {
    if (e.pointerId !== pid) return;
    e.preventDefault();
    const a = angleAt(e.clientX, e.clientY);
    const d = ((a - last + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    last = a;
    total += Math.abs(d);
    // the turn accumulates, so a slow, careful one still crosses the dead band
    acc += d;
    if (acc > dead) { acc = 0; dir(false, true); }
    else if (acc < -dead) { acc = 0; dir(true, false); }
    clearIdle();
    idle = setTimeout(() => { idle = null; acc = 0; dir(false, false); }, idleMs);
  });
  const end = (e) => {
    if (e.type !== 'pointercancel' && e.pointerId !== pid) return;
    if (e.type === 'pointerup' && total < 0.08) {
      if (o.onTap) o.onTap();
      if (o.tap) { click('menu'); emitKey(o.tap, 'keydown'); emitKey(o.tap, 'keyup'); }
    }
    stop();
  };
  dial.addEventListener('pointerup', end);
  dial.addEventListener('pointercancel', end);
  dial.addEventListener('lostpointercapture', (e) => { if (e.pointerId === pid) stop(); });
}

// The physical keyboard already reaches the game: this only lights the deck to match.
function bindKeyboard() {
  for (const [type, down] of [['keydown', true], ['keyup', false]])
    document.addEventListener(type, (e) => { const n = nameForCode(e.code); if (n) set(n, down, { silent: true }); });
}

// poll(press, release) reports gamepad codes (GP_NAME); they drive player one.
function bindGamepad(poll) {
  if (typeof poll !== 'function') return;
  const to = (down) => (code) => { if (GP_NAME[code]) set(GP_NAME[code], down); };
  poll(to(true), to(false));
}

function registerVisual(root) { if (root && !roots.includes(root)) roots.push(root); }

/** opts: canvas (gets the key events), buttons [{ key, code }], keys { name: { key, code } } (more names, e.g.
 *  p2up), gate() (true holds input back), onInput(name, down), onStart(), onSelect(), feedback() (a haptic tick on
 *  each press), click(kind) (a press sound: 'face', 'dpad', 'menu' or a cap's data-blip-kind). */
function init(opts = {}) {
  for (const k in cfg) if (opts[k] !== undefined) cfg[k] = opts[k];
  keymap = buildKeymap(opts.buttons, opts.keys);
  return BlipController;
}

export const BlipController = { init, set, releaseAll, registerVisual, bindButtons, bindDpad, bindDial, bindKeyboard,
  bindGamepad };
