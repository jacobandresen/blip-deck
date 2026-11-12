import { test } from 'node:test';
import assert from 'node:assert/strict';
import { box, frame, pointer } from './setup.js';

const { BlipController, BlipDeck, BlipDeckElement, bindStick, lean } = await import('../src/index.js');
const root = document.documentElement;

function deck(attrs = '', inner = '') {
  document.body.innerHTML = `<blip-deck ${attrs}>${inner}</blip-deck>`;
  return document.body.firstChild;
}
const caps = (el, sel) => [...el.querySelectorAll(sel)].map((c) => [c.className, c.dataset.blip, c.getAttribute('aria-label')]);

test('the bundle sets its globals and defines the element', () => {
  assert.equal(window.BlipController, BlipController);
  assert.deepEqual(window.BlipDeck, BlipDeck);
  assert.equal(customElements.get('blip-deck'), BlipDeckElement);
});

test('without buttons the pad caps fire and the stick caps are plain', () => {
  const el = deck('', '<div id="dial"></div>');
  assert.ok(el.classList.contains('deck-panel'));
  assert.deepEqual([...el.children].map((c) => c.id), ['deck-p1', 'deck-p2', 'snes-pad', 'snes-pad-p2', 'dial']);
  assert.deepEqual(caps(el, '#fire-buttons > *'), [['arcade-btn lettered', undefined, null], ['arcade-btn lettered', undefined, null]]);
  assert.deepEqual(caps(el, '#snes-pad .snes-face > *'), [['snes-btn cap1', 'button1', null], ['snes-btn cap2', 'button1', null]]);
  assert.deepEqual(caps(el, '#snes-pad-p2 .snes-face > *'), [['snes-btn cap1 spare', undefined, null], ['snes-btn cap2 spare', undefined, null]]);
  assert.deepEqual([...el.querySelectorAll('#snes-pad-p2 .snes-dp-seg')].map((s) => s.dataset.blip), ['p2up', 'p2right', 'p2down', 'p2left']);
  assert.equal(el.querySelectorAll('.snes-wordmark').length, 1);
  assert.equal(el.querySelector('#snes-pad-p2 linearGradient').id, 'dpg-p2');
  assert.deepEqual([root.dataset.caps, root.dataset.players, root.dataset.seats], ['4', '2', '1']);
});

test("a game's two actions get legends, a blue second cap and a second seat", () => {
  const el = deck(`seats="2" cap-label="KICK" buttons='[{"label":"JUMP"},{}]'`);
  assert.deepEqual(caps(el, '#fire-buttons-p2 > *'), [['arcade-btn lettered', 'p2button1', 'JUMP'], ['arcade-btn lettered alt', 'p2button2', 'KICK']]);
  assert.equal(el.querySelector('#snes-pad .cap2 .cap-legend').textContent, 'KICK');
  assert.equal(root.dataset.seats, undefined);
  el.remove();
  assert.equal(root.dataset.caps, undefined);
});

test('one action is on both caps, FIRE unless named', () => {
  const el = deck(`buttons='[{}]'`);
  assert.deepEqual(caps(el, '#fire-buttons > *'), [['arcade-btn lettered', 'button1', 'FIRE'], ['arcade-btn lettered', 'button2', 'FIRE']]);
  assert.deepEqual(caps(el, '#fire-buttons-p2 > *').map((c) => c[0]), ['arcade-btn lettered spare', 'arcade-btn lettered spare']);
  el.buttons = [];
  el.performUpdate();
  assert.deepEqual(caps(el, '#fire-buttons > *').map((c) => c[1]), [undefined, undefined]);
});

// A deck 400 wide at the foot of a 400 x 200 screen: each stick 40 square, its ball above it, its caps right of it.
function stations() {
  const el = deck('seats="2"');
  box(el, 0, 100, 400, 100);
  const st = [0, 1].map((who) => {
    const stick = box(el.querySelector(who ? '#stick-base-p2' : '#stick-base'), 20 + who * 200, 140, 40, 40);
    box(stick.querySelector('.stick-ball'), 20 + who * 200, 100, 40, 40);
    const fire = box(el.querySelector(who ? '#fire-buttons-p2' : '#fire-buttons'), 120 + who * 200, 140, 60, 40);
    const p = who ? 'p2' : '';
    return { stick, fire, dirs: { up: p + 'up', down: p + 'down', left: p + 'left', right: p + 'right' } };
  });
  return { el, st };
}
const held = [];
BlipController.init({ keys: Object.fromEntries(['up', 'down', 'left', 'right'].map((d) => ['p2' + d, { key: d, code: d }])), onInput: (n, d) => held.push(n + (d ? '+' : '-')) });
const moved = () => held.splice(0).join(' ');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('a drag on the stick leans through the gate, with hysteresis and a following centre', async () => {
  const { st } = stations();
  assert.equal(bindStick({})(), undefined); // no stick, nothing to stop
  const stop = bindStick(st[0]);
  const at = (x, y, o) => pointer(window, 'pointermove', x, y, o);
  pointer(st[0].stick, 'pointerdown', 40, 160);
  at(40, 150); // inside the engage radius
  assert.equal(moved(), '');
  await wait(10);
  at(40, 120); // up
  assert.equal(moved(), 'up+');
  at(70, 120); // within 8 ms: waits for a frame
  at(80, 120);
  frame();
  assert.equal(moved(), 'right+'); // up and right
  await wait(10);
  // (80, 120) was past maxR: the centre followed to about (47.5, 152.5)
  at(47.5, 162); // back in, but past the release radius: still held, now down
  await wait(10);
  at(47.5, 158); // inside the release radius
  assert.equal(moved(), 'up- down+ right- down-');
  await wait(10);
  at(40, 300); // far down: the centre follows
  await wait(10);
  at(25.4, 290.3); // 25 degrees off down, now about (42.3, 254.1): within the gate's hysteresis
  assert.equal(moved(), 'down+');
  await wait(10);
  at(140, 254); // right of the centre
  at(140, 254, { pointerId: 2 });
  assert.equal(moved(), 'down- right+');
  pointer(window, 'pointerup', 0, 0, { pointerId: 2 });
  at(150, 300); // a frame is asked for, then the pointer lets go
  pointer(window, 'pointerup');
  frame();
  assert.equal(moved(), 'right-');
  // a frame left over from a move flushed early
  pointer(st[0].stick, 'pointerdown', 40, 160);
  await wait(10);
  at(40, 160);
  at(40, 161);
  await wait(10);
  at(40, 100);
  frame();
  pointer(window, 'pointercancel', 0, 0, { pointerId: 7 });
  assert.equal(moved(), 'up+ up-');
  stop();
});

test('where a drag may start', () => {
  const { el, st } = stations();
  const zone = document.createElement('div');
  el.append(zone);
  const unbind = [
    bindStick(st[0], { split: true, active: () => active, tuning: { engage: 2, release: 1, maxR: 10, hyst: 0 } }),
    bindStick({ ...st[1], fire: null }, { who: 1, split: true, bar: el }),
    bindStick({ stick: st[0].stick, dirs: { up: 'x', down: 'x', left: 'x', right: 'x' } }, { zone }),
  ];
  let active = false;
  const tryAt = (target, x, y) => {
    pointer(target, 'pointerdown', x, y);
    pointer(window, 'pointermove', x, y - 20);
    pointer(window, 'pointerup', x, y - 20);
    return moved();
  };
  assert.equal(tryAt(st[0].stick, 40, 160), ''); // not in stick mode
  active = true;
  assert.equal(tryAt(st[0].stick, 40, 160), 'up+ up-');
  assert.equal(tryAt(el, 40, 120), 'up+ up-'); // on the raised ball
  assert.equal(tryAt(el, 80, 190), 'up+ up-'); // the station's half, short of its caps
  assert.equal(tryAt(el, 116, 190), ''); // by the caps
  assert.equal(tryAt(st[0].fire, 0, 0), '');
  assert.equal(tryAt(el, 300, 190), 'p2up+ p2up-'); // station two's half, which has no caps
  assert.equal(tryAt(zone, 300, 190), 'p2up+ p2up-');
  box(st[0].fire, 0, 0, 0, 0);
  assert.equal(tryAt(el, 190, 190), 'up+ up-');
  box(st[0].stick, 0, 0, 0, 0);
  assert.equal(tryAt(el, 190, 190), '');
  unbind.forEach((f) => f());
  assert.equal(tryAt(el, 300, 190), '');
});

test('a second press, a blur or a hidden page lets go', () => {
  const { st } = stations();
  const stop = bindStick(st[0]);
  const lift = (fn) => {
    pointer(st[0].stick, 'pointerdown', 40, 160);
    pointer(window, 'pointermove', 40, 120);
    fn();
    return moved();
  };
  assert.equal(lift(() => pointer(st[0].stick, 'pointerdown', 40, 160, { pointerId: 3 })), 'up+ up-');
  assert.equal(lift(() => dispatchEvent(new Event('blur'))), 'up+ up-');
  assert.equal(lift(() => document.dispatchEvent(new Event('visibilitychange'))), 'up+');
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  delete document.hidden;
  assert.equal(moved(), 'up-');
  stop();
});

test('a stick leans as far on a diagonal as straight', () => {
  const stick = document.createElement('div');
  lean(stick, 1, 0);
  assert.deepEqual([stick.style.getPropertyValue('--dx'), stick.style.getPropertyValue('--dy')], ['1', '0']);
  lean(stick, -1, 1);
  assert.equal(Number(stick.style.getPropertyValue('--dx')).toFixed(4), '-0.7071');
});
