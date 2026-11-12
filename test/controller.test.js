import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { box, frame, pointer, touches } from './setup.js';

const { BlipController: C } = await import('../src/controller.js');

const canvas = document.createElement('canvas');
const keys = [];
for (const type of ['keydown', 'keyup']) canvas.addEventListener(type, (e) => keys.push(`${type === 'keydown' ? '+' : '-'}${e.code}`));
const take = () => keys.splice(0).join(' ');
const sounds = [], inputs = [];
let gate = false, ticks = 0;

// Two buttons, a second player's up, and a name that shares button1's key.
const setup = (o) => C.init({ canvas, buttons: [{ key: 'z', code: 'KeyZ' }, { key: 'x', code: 'KeyX' }],
  keys: { p2up: { key: 'w', code: 'KeyW' }, p2down: null, mirror: { key: 'z', code: 'KeyZ' } }, ...o });

beforeEach(() => { C.releaseAll(); take(); sounds.length = inputs.length = 0; });

function dom(markup) {
  const root = document.createElement('div');
  root.innerHTML = markup;
  document.body.append(root);
  return root;
}

test('before init, nothing moves', () => {
  C.bindKeyboard();
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
  C.set('up', true);
  assert.equal(take(), '');
});

test('a game with no buttons fires on Space from both caps', () => {
  assert.equal(C.init(), C);
  C.init({ canvas, buttons: [] });
  C.set('button2', true);
  C.set('button2', false);
  assert.equal(take(), '+Space -Space');
  C.set('button3', true); // not declared
  assert.equal(take(), '');
});

test('names become key events on the canvas, once per state change', () => {
  setup({
    gate: () => gate, onInput: (n, d) => inputs.push(`${n}${d ? '+' : '-'}`),
    click: (k) => sounds.push(k), feedback: () => ticks++,
  });
  C.set('up', true);
  C.set('up', true);
  C.set('button2', 1);
  C.set('p2up', true);
  C.set('p2down', true);
  assert.equal(take(), '+ArrowUp +KeyX +KeyW');
  assert.deepEqual(sounds.splice(0), ['dpad', 'face', 'dpad']);
  assert.equal(ticks, 3);
  C.set('up', false, { silentClick: true });
  C.set('button2', true, { silentClick: true });
  assert.equal(take(), '-ArrowUp');
  C.set('left', true, { silent: true });
  C.set('left', false, { silent: true });
  assert.equal(take(), '');
  assert.deepEqual(inputs.splice(0), ['up+', 'button2+', 'p2up+', 'up-', 'left+', 'left-']);
});

test('two names on one key press it once and release it with the last', () => {
  C.set('button1', true);
  C.set('mirror', true);
  C.set('button1', false);
  assert.equal(take(), '+KeyZ');
  C.set('mirror', false);
  assert.equal(take(), '-KeyZ');
});

test('the gate holds input back but lets select through', () => {
  const calls = [];
  setup({ onStart: () => calls.push('start'), onSelect: () => calls.push('select') });
  gate = true;
  C.set('button1', true);
  C.set('start', true);
  C.set('select', true);
  assert.equal(take(), '');
  assert.deepEqual(calls.splice(0), ['select']);
  gate = false;
  C.set('button1', false);
  C.set('start', false);
  C.set('start', true);
  C.set('start', true);
  C.set('start', false);
  C.set('select', false);
  C.set('select', true, { silent: true });
  assert.deepEqual(calls, ['start', 'select']);
  assert.deepEqual(sounds.splice(0), ['menu', 'menu']);
  setup({ onStart: null, onSelect: null, gate: null });
  C.set('start', false);
  C.set('start', true);
  C.set('select', false);
  C.set('select', true);
  C.releaseAll();
});

test('a throwing consumer does not stop the deck', () => {
  setup({ onInput: () => { throw new Error('x'); }, feedback: () => { throw new Error('y'); }, click: () => { throw new Error('z'); } });
  C.set('down', true);
  C.set('down', false);
  assert.equal(take(), '+ArrowDown -ArrowDown');
  setup({ onInput: null, feedback: null, click: null });
  C.set('down', true);
  C.set('down', false);
  take();
});

test('the keyboard lights the deck without sending keys', () => {
  const root = dom('<span data-blip="p2up"></span><span data-blip="left"></span>');
  C.registerVisual(root);
  C.registerVisual(root);
  C.registerVisual(null);
  const press = (type, code) => document.dispatchEvent(new KeyboardEvent(type, { code }));
  press('keydown', 'KeyW');
  press('keydown', 'KeyA');
  press('keydown', 'KeyQ');
  assert.deepEqual([...root.querySelectorAll('.blip-pressed')].map((e) => e.dataset.blip), ['p2up', 'left']);
  press('keyup', 'KeyW');
  press('keyup', 'KeyA');
  assert.equal(root.querySelectorAll('.blip-pressed').length, 0);
  assert.equal(take(), '');
});

test('a gamepad drives player one', () => {
  C.bindGamepad(null);
  C.bindGamepad((press, release) => { press('Space'); press('Nope'); release('Space'); release('Nope'); });
  assert.equal(take(), '+KeyZ -KeyZ');
});

test('caps press with a mouse and lift with it', () => {
  setup({ click: (k) => sounds.push(k) });
  C.bindButtons(null);
  const root = dom('<b data-blip="button1"></b><b data-blip="start button2" data-blip-kind="shoulder"></b><b data-blip="up" data-blip-nopress></b>');
  C.bindButtons(root);
  const [a, b, arm] = root.children;
  pointer(a, 'pointerdown');
  pointer(a, 'pointerdown');
  assert.ok(a.classList.contains('blip-pressed'));
  pointer(a, 'pointerup', 0, 0, { pointerId: 9 });
  pointer(a, 'pointerup');
  pointer(a, 'pointerup');
  pointer(arm, 'pointerdown');
  b.setPointerCapture = () => { throw new Error('no capture'); };
  pointer(b, 'pointerdown');
  pointer(b, 'lostpointercapture');
  assert.equal(take(), '+KeyZ -KeyZ +KeyX -KeyX');
  assert.deepEqual(sounds.splice(0), ['face', 'shoulder', 'menu']); // start is a menu button
  pointer(a, 'pointerdown', 0, 0, { pointerType: 'touch' });
  pointer(a, 'pointerup', 0, 0, { pointerType: 'touch' });
  assert.equal(take(), '');
});

test('the cross resolves a pointer to four ways with a dead centre', () => {
  const root = dom('<div class="pad"><i class="dp-up"></i><i class="dp-down"></i><i class="dp-left"></i><i class="dp-right"></i></div><div class="bare"></div>');
  const pad = box(root.firstChild, 0, 0, 100, 100), bare = box(root.lastChild, 300, 0, 100, 100);
  C.bindDpad(null);
  C.bindDpad(pad);
  C.bindDpad(bare, { dead: 0.5, names: { up: 'p2up', down: 'p2down', left: 'p2left', right: 'p2right' } });
  pointer(pad, 'pointerdown', 90, 90);
  assert.equal(take(), '+ArrowRight +ArrowDown');
  assert.ok(pad.querySelector('.dp-down').classList.contains('blip-pressed') && pad.classList.contains('blip-touched'));
  pointer(pad, 'pointermove', 10, 50, { pointerId: 9 });
  pointer(pad, 'pointermove', 10, 50);
  pointer(pad, 'pointermove', 10, 50, { pointerType: 'touch' });
  assert.equal(take(), '+ArrowLeft -ArrowRight -ArrowDown');
  pointer(pad, 'pointercancel');
  assert.equal(take(), '-ArrowLeft');
  assert.ok(!pad.classList.contains('blip-touched'));
  pointer(bare, 'pointerdown', 340, 0);
  pointer(bare, 'pointerup', 340, 0);
  assert.equal(take(), '+KeyW -KeyW');
});

test('touches belong to the nearest control, and lifts wait a frame', () => {
  const root = dom('<b data-blip="button1"></b><b data-blip="button2"></b><b data-blip="up"></b><div class="pad"></div>');
  const [a, b, hidden, pad] = root.children;
  box(a, 500, 0, 40, 40); box(b, 520, 0, 40, 40); box(hidden, 0, 0, 0, 0); box(pad, 600, 0, 100, 100);
  C.bindButtons(root);
  C.bindDpad(pad);
  touches('touchstart', [[510, 20], [700, 200]]); // a; far from all
  assert.equal(take(), '+KeyZ');
  touches('touchmove', [[525, 20]]); // inside a and b, a's centre is nearer
  touches('touchmove', [[535, 20], [536, 20]]); // b's centre is nearer
  assert.equal(take(), '+KeyX');
  frame();
  assert.equal(take(), '-KeyZ');
  touches('touchmove', [[690, 50], [650, 95]]); // pad: the first touch on it counts
  touches('touchmove', []);
  touches('touchmove', []);
  touches('touchend', [[535, 20]]);
  assert.equal(take(), '+ArrowRight');
  frame();
  assert.equal(take(), '-ArrowRight');
  touches('touchend', []);
  dispatchEvent(new Event('resize'));
  touches('touchstart', [[535, 20]]);
  frame();
  assert.equal(take(), '');
  touches('touchend', []);
  frame();
  assert.equal(take(), '-KeyX');
  C.bindButtons(dom('<b data-blip="button1"></b>'));
  touches('touchend', []);
});

test('releaseAll lets go of everything', () => {
  const root = dom('<b data-blip="button1"></b>');
  C.bindButtons(root);
  pointer(root.firstChild, 'pointerdown');
  C.set('left', true);
  C.releaseAll();
  assert.equal(take(), '+KeyZ +ArrowLeft -ArrowLeft -KeyZ'); // the cross lets go of left first
});

test('a dial turns into up and down, and a still press is a tap', async () => {
  const up = { key: 'i', code: 'KeyI' }, down = { key: 'k', code: 'KeyK' }, tap = { key: '2', code: 'Digit2' };
  const calls = [];
  const root = dom('<div></div><div></div>');
  const [dial, plain] = [...root.children].map((d) => box(d, 0, 0, 100, 100));
  C.bindDial(null);
  C.bindDial(dial, { up, down, tap, dead: 0.1, idleMs: 5, onTap: () => calls.push('tap'), onInteract: () => calls.push('grab') });
  C.bindDial(plain);
  const at = (deg) => [50 + 40 * Math.cos(deg * Math.PI / 180), 50 + 40 * Math.sin(deg * Math.PI / 180)];
  pointer(dial, 'pointerdown', ...at(170));
  pointer(dial, 'pointerdown', ...at(170), { pointerId: 2 });
  assert.ok(dial.classList.contains('active'));
  pointer(dial, 'pointermove', ...at(-170), { pointerId: 2 });
  pointer(dial, 'pointermove', ...at(-170)); // across the seam, clockwise
  assert.equal(take(), '+KeyK');
  pointer(dial, 'pointermove', ...at(-172));
  pointer(dial, 'pointermove', ...at(170));
  assert.equal(take(), '+KeyI -KeyK');
  pointer(dial, 'pointermove', ...at(171));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(take(), '-KeyI');
  pointer(dial, 'pointerup', 0, 0, { pointerId: 2 });
  pointer(dial, 'pointerup');
  assert.ok(!dial.classList.contains('active'));
  pointer(dial, 'pointerdown', ...at(0));
  pointer(dial, 'lostpointercapture', 0, 0, { pointerId: 2 });
  pointer(dial, 'pointerup', ...at(0));
  assert.equal(take(), '+Digit2 -Digit2');
  pointer(dial, 'pointerdown', ...at(0));
  pointer(dial, 'pointercancel');
  pointer(dial, 'pointerdown', ...at(0));
  pointer(dial, 'pointermove', ...at(30));
  pointer(dial, 'lostpointercapture');
  assert.equal(take(), '+KeyK -KeyK');
  assert.deepEqual(calls, ['grab', 'grab', 'tap', 'grab', 'grab']);
  dial.setPointerCapture = () => { throw new Error('no capture'); };
  pointer(plain, 'pointerdown');
  pointer(plain, 'pointermove', 100, 50);
  pointer(plain, 'pointerup', 100, 50);
  plain.setPointerCapture = dial.setPointerCapture;
  pointer(plain, 'pointerdown');
  pointer(plain, 'pointerup');
  gate = true;
  setup({ gate: () => gate });
  pointer(dial, 'pointerdown', ...at(0));
  pointer(dial, 'pointermove', ...at(30));
  pointer(dial, 'pointerup', ...at(30));
  assert.equal(take(), '-KeyK'); // held back on the way down, not up
  gate = false;
  setup({ canvas: null });
  pointer(dial, 'pointerdown', ...at(0));
  pointer(dial, 'pointermove', ...at(30));
  C.releaseAll();
  assert.equal(take(), '');
});
