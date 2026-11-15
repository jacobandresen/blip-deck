import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { box, hold, pointer, touch } from './setup.js';

const { BlipDeck, LABELS } = await import('../src/index.js');

let deck, events;
/** A deck with `attrs`, its parts laid out: per station a 200px column, stick or cross at 0-80, buttons at 100 and 150. */
function make(attrs = '') {
  document.body.innerHTML = `<blip-deck ${attrs}></blip-deck>`;
  deck = document.body.firstChild;
  events = [];
  deck.addEventListener('blip-input', (e) => events.push(`${e.detail.name} ${e.detail.down ? 'down' : 'up'}`));
  layout();
  return deck;
}
function layout() {
  for (const st of $$('.station')) {
    const x = 200 * Number(st.dataset.who);
    const pad = deck.getAttribute('controls') === 'pad'; // the one not shown has no box, as in a browser
    box(st.querySelector('.stick'), x, 0, pad ? 0 : 80, 100);
    box(st.querySelector('.dpad'), x, 0, pad ? 80 : 0, 80);
    st.querySelectorAll('.cap').forEach((cap, i) => box(cap, x + 100 + 50 * i, 20, 40, 40));
  }
}
const $ = (s) => deck.shadowRoot.querySelector(s);
const $$ = (s) => [...deck.shadowRoot.querySelectorAll(s)];
const take = () => events.splice(0);

beforeEach(() => make());

test('one tag defines the element and draws one station with a stick, a cross and one button', () => {
  assert.equal(customElements.get('blip-deck'), BlipDeck);
  assert.equal($$('.station').length, 1);
  assert.ok($('.stick') && $('.dpad') && $('style'));
  assert.deepEqual($$('.cap').map((c) => c.dataset.name), ['button1']);
});

test('buttons get legends; two seats give station two its own names', () => {
  make(`seats="2" buttons='["FIRE","JUMP","EXTRA"]'`);
  assert.deepEqual($$('.cap').map((c) => [c.dataset.name, c.textContent]),
    [['button1', 'FIRE'], ['button2', 'JUMP'], ['p2button1', 'FIRE'], ['p2button2', 'JUMP']]);
  assert.deepEqual($$('.station[data-who="1"] .arm').map((a) => a.dataset.name), ['p2up', 'p2right', 'p2down', 'p2left']);
});

test('a bad buttons attribute falls back to one plain button', () => {
  make(`buttons='{"oops"'`);
  assert.deepEqual($$('.cap').map((c) => c.textContent), ['']);
  make(`buttons='[]'`);
  assert.equal($$('.cap').length, 1);
});

test('screen readers hear what each part is, in the page\'s language', () => {
  make(`seats="2" solo buttons='["","<b>"]'`);
  assert.equal($('.station').getAttribute('aria-label'), 'Player 1');
  assert.deepEqual($$('.cap').slice(0, 2).map((c) => c.getAttribute('aria-label')), ['Button 1', '<b>']);
  assert.equal($('.station[data-who="1"]').getAttribute('aria-disabled'), 'true');
  assert.equal($('.station[data-who="1"] .legend'), null); // nobody sits there: no instructions
  assert.equal($('.cap').getAttribute('aria-pressed'), 'false');
  deck.labels = { player: 'Spieler {n}', up: 'Hoch' };
  assert.equal($$('.station')[1].getAttribute('aria-label'), 'Spieler 2');
  assert.equal($('.arm.up').getAttribute('aria-label'), 'Hoch');
  assert.equal($('.arm.down').getAttribute('aria-label'), LABELS.down);
  assert.equal(deck.labels.stick, 'Joystick');
  const loose = document.createElement('blip-deck');
  loose.labels = { pad: 'Kreuz' }; // before it is in the page: used when it renders
  document.body.append(loose);
  assert.equal(loose.shadowRoot.querySelector('.dpad').getAttribute('aria-label'), 'Kreuz');
});

test('a mouse presses a button, slides to the next, and lets go', () => {
  make(`buttons='["A","B"]'`);
  pointer(deck, 'pointerdown', 120, 40);
  assert.deepEqual(take(), ['button1 down']);
  assert.equal($('.cap').getAttribute('aria-pressed'), 'true');
  hold();
  pointer(deck, 'pointermove', 195, 40); // 5px past the second button: within the slop
  assert.deepEqual(take(), ['button1 up', 'button2 down']);
  hold();
  pointer(deck, 'pointermove', 400, 40);
  assert.deepEqual(take(), ['button2 up']);
  pointer(deck, 'pointerup', 400, 40);
  pointer(deck, 'pointermove', 120, 40); // not held: nothing
  assert.deepEqual(take(), []);
});

test('a quick tap lasts a frame: its release waits, then fires', async () => {
  pointer(deck, 'pointerdown', 120, 40);
  pointer(deck, 'pointerup', 120, 40);
  assert.deepEqual(take(), ['button1 down']);
  assert.equal($('.cap').getAttribute('aria-pressed'), 'true');
  hold(20);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(take(), ['button1 up']);
});

test('a pointer the browser cannot capture (a synthetic one) still presses', () => {
  deck.setPointerCapture = () => { throw new DOMException('no such pointer', 'NotFoundError'); };
  pointer(deck, 'pointerdown', 120, 40);
  assert.deepEqual(take(), ['button1 down']);
});

test('a press off every control does nothing', () => {
  pointer(deck, 'pointerdown', 90, 300);
  pointer(deck, 'pointerup', 90, 300);
  assert.deepEqual(take(), []);
});

test('dragging the stick holds directions and leans it', () => {
  pointer(deck, 'pointerdown', 40, 50);
  pointer(deck, 'pointermove', 40, 20);
  assert.deepEqual(take(), ['up down']);
  assert.equal($('.station').style.getPropertyValue('--dy'), '-1');
  hold();
  pointer(deck, 'pointermove', 70, 20);
  assert.deepEqual(take(), ['right down']);
  assert.equal(Number($('.station').style.getPropertyValue('--dx')).toFixed(3), Math.SQRT1_2.toFixed(3));
  hold();
  pointer(deck, 'pointercancel', 70, 20);
  assert.deepEqual(take(), ['up up', 'right up']);
});

test('the stick takes its tuning', () => {
  deck.tuning = { engage: 40 };
  pointer(deck, 'pointerdown', 40, 50);
  pointer(deck, 'pointermove', 40, 20);
  assert.deepEqual(take(), []);
});

test('the cross reads where the thumb is from its centre', () => {
  make('controls="pad"');
  pointer(deck, 'pointerdown', 75, 40);
  assert.deepEqual(take(), ['right down']);
  hold();
  pointer(deck, 'pointermove', 5, 75);
  assert.deepEqual(take(), ['right up', 'down down', 'left down']);
});

test('fingers each hold their own control; the touch list decides what is still down', () => {
  make(`seats="2" buttons='["A","B"]'`);
  const e = touch(deck, 'touchstart', [[1, 120, 40]]);
  assert.ok(e.defaultPrevented);
  touch(deck, 'touchstart', [[1, 120, 40], [2, 320, 40]], [[2, 320, 40]]);
  assert.deepEqual(take(), ['button1 down', 'p2button1 down']);
  hold();
  touch(deck, 'touchmove', [[1, 170, 40], [2, 320, 40]]);
  assert.deepEqual(take(), ['button1 up', 'button2 down']);
  hold();
  touch(deck, 'touchcancel', [[2, 320, 40]], [[1, 170, 40]]);
  assert.deepEqual(take(), ['button2 up']);
  touch(deck, 'touchend', [], [[2, 320, 40]]);
  assert.deepEqual(take(), ['p2button1 up']);
  pointer(deck, 'pointerdown', 120, 40, { pointerType: 'touch' }); // the touch events had it
  assert.deepEqual(take(), []);
});

test('an idle station takes no input', () => {
  make('seats="2" solo');
  pointer(deck, 'pointerdown', 320, 40);
  assert.deepEqual(take(), []);
});

test('press() lights a control without firing; release() lets go of everything', () => {
  deck.press('up', true);
  assert.equal($('.arm.up').getAttribute('aria-pressed'), 'true');
  assert.equal($('.station').style.getPropertyValue('--dy'), '-1');
  assert.deepEqual(take(), []);
  deck.press('up', false);
  assert.equal($('.arm.up').getAttribute('aria-pressed'), 'false');
  pointer(deck, 'pointerdown', 120, 40);
  deck.press('button1', true);
  deck.release();
  assert.deepEqual(take(), ['button1 down', 'button1 up']);
  assert.equal($('.cap').getAttribute('aria-pressed'), 'false');
});

test('changing the buttons redraws and lets go first; leaving the page lets go', () => {
  pointer(deck, 'pointerdown', 120, 40);
  deck.setAttribute('buttons', '["X"]');
  assert.deepEqual(take(), ['button1 down', 'button1 up']);
  assert.equal($('.cap').textContent, 'X');
  layout();
  pointer(deck, 'pointerdown', 120, 40, { pointerId: 2 });
  deck.remove();
  assert.deepEqual(take(), ['button1 down', 'button1 up']);
});

test('no context menu from a long press', () => {
  const e = new Event('contextmenu', { cancelable: true });
  deck.dispatchEvent(e);
  assert.ok(e.defaultPrevented);
});
