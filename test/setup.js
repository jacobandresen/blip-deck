// A DOM for node:test (happy-dom). happy-dom does no layout, so tests give elements their boxes by hand.
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/' });

// The deck's clock, moved by hand: hold(ms) is a finger staying down that long.
let now = 0;
performance.now = () => now;
export function hold(ms = 50) { now += ms; }

/** Give el a layout box. */
export function box(el, left, top, width, height) {
  el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
  return el;
}

/** A mouse (or pen) event on the deck. */
export function pointer(deck, type, x, y, o = {}) {
  deck.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, ...o }));
}

/** A touch event on the deck: `down` is every finger on the glass, `changed` the ones this event is about. */
export function touch(deck, type, down, changed = down) {
  const list = (pts) => pts.map(([identifier, clientX, clientY]) => ({ identifier, clientX, clientY }));
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { touches: list(down), changedTouches: list(changed) });
  deck.dispatchEvent(e);
  return e;
}
