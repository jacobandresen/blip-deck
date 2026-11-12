// A DOM for node:test (happy-dom), frames run by hand, and rects set by hand: happy-dom does no layout.
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register({ url: 'http://localhost/' });
const frames = new Map();
let nextFrame = 1;
globalThis.requestAnimationFrame = (fn) => { frames.set(nextFrame, fn); return nextFrame++; };
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
/** Run the frames asked for so far. */
export function frame() {
  const due = [...frames.values()];
  frames.clear();
  for (const fn of due) fn();
}
/** Give el a layout box. */
export function box(el, left, top, width, height) {
  el.getBoundingClientRect = () => ({ left, top, width, height, right: left + width, bottom: top + height });
  return el;
}
export function pointer(target, type, x = 0, y = 0, o = {}) {
  const e = new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, ...o });
  target.dispatchEvent(e);
  return e;
}
export function touches(type, list) {
  const e = new Event(type);
  e.touches = list.map(([clientX, clientY]) => ({ clientX, clientY }));
  document.dispatchEvent(e);
}
