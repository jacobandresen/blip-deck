// Every combination the deck offers, drawn by a real browser at phone to desktop widths: nothing overlaps, nothing
// leaves the deck. Needs Chromium: CHROMIUM=/path/to/chrome, or `npx playwright install chromium`.
//   npm run test:browser
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SCRIPT = readFileSync(new URL('../../dist/blip-deck.js', import.meta.url), 'utf8');
const UPRIGHT = [320, 375, 430, 768, 1280];
const LANDSCAPE = [[667, 375], [844, 390], [1180, 820]];
const CASES = [];
for (const controls of ['stick', 'pad'])
  for (const seats of ['1', '2 solo', '2'])
    for (const buttons of ['[""]', '["FIRE"]', '["FIRE","JUMP"]', '["SPECIAL","ESCAPE"]'])
      CASES.push({ controls, seats, buttons });

let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); });
after(() => browser?.close());

/** The boxes of what is drawn: the stick (washer and ball) or cross, each button, each legend. */
function measure() {
  const deck = document.querySelector('blip-deck'), root = deck.shadowRoot;
  const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width }; };
  const parts = [];
  for (const st of root.querySelectorAll('.station')) {
    const who = st.dataset.who;
    const stick = st.querySelector('.stick');
    if (stick.getBoundingClientRect().width) {
      const w = r(st.querySelector('.washer')), ball = r(st.querySelector('.ball'));
      parts.push({ name: `stick ${who}`, l: Math.min(w.l, ball.l), t: Math.min(w.t, ball.t), r: Math.max(w.r, ball.r), b: Math.max(w.b, ball.b) });
    } else parts.push({ name: `cross ${who}`, ...r(st.querySelector('.dpad svg')) });
    st.querySelectorAll('.cap').forEach((c, i) => parts.push({ name: `button ${who}.${i}`, ...r(c) }));
    st.querySelectorAll('.legend').forEach((c, i) => parts.push({ name: `legend ${who}.${i}`, ...r(c), cut: c.scrollWidth > c.clientWidth + 1 }));
  }
  return { deck: r(deck), parts, overflow: document.documentElement.scrollWidth > innerWidth };
}

/** What is wrong with a drawing, as a list of sentences. */
function problems({ deck, parts, overflow }, where, { whole = false } = {}) {
  const PAD = 1, found = []; // PAD: sub-pixel rounding
  if (overflow) found.push(`${where}: the page scrolls sideways`);
  const of = (re) => parts.filter((p) => re.test(p.name));
  // Thumb-sized and round: a button is at least 34px across (44 with room to spare) and the tilt keeps it round.
  for (const b of of(/^button/)) {
    const w = b.r - b.l, h = b.b - b.t, least = deck.r - deck.l >= 760 ? 44 : 34;
    if (w < least || h < least * 0.85) found.push(`${where}: ${b.name} is only ${Math.round(w)}x${Math.round(h)}`);
    if (Math.max(w, h) / Math.min(w, h) > 1.35) found.push(`${where}: ${b.name} is squashed to ${Math.round(w)}x${Math.round(h)}`);
  }
  // Two players: the daylight is between them, at least 24px from one's last control to the other's first.
  const [one, two] = [0, 1].map((who) => parts.filter((p) => p.name.endsWith(` ${who}`) || p.name.includes(` ${who}.`)));
  if (two.length && Math.min(...two.map((p) => p.l)) - Math.max(...one.map((p) => p.r)) < 24 && one.every((p) => p.r < deck.l + (deck.r - deck.l) / 2 + 1))
    found.push(`${where}: less than 24px between the players`);
  if (whole) for (const p of parts) if (p.cut) found.push(`${where}: ${p.name} is cut short`);
  for (const p of parts)
    if (p.l < deck.l - PAD || p.r > deck.r + PAD || p.t < deck.t - PAD || p.b > deck.b + PAD) found.push(`${where}: ${p.name} leaves the deck`);
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j];
      if (Math.min(a.r, b.r) - Math.max(a.l, b.l) > PAD && Math.min(a.b, b.b) - Math.max(a.t, b.t) > PAD) found.push(`${where}: ${a.name} overlaps ${b.name}`);
    }
  return found;
}

async function draw(page, attrs, style) {
  await page.setContent(`<!doctype html><body style="margin:0;background:#000"><blip-deck ${attrs} style="${style}"></blip-deck><script>${SCRIPT}</script></body>`);
  return page.evaluate(measure);
}

test('upright: every controller, seat and button count fits from 320px to desktop', async () => {
  const page = await browser.newPage(), found = [];
  for (const width of UPRIGHT) {
    await page.setViewportSize({ width, height: 800 });
    for (const c of CASES) {
      const [n, solo = ''] = c.seats.split(' ');
      const attrs = `controls="${c.controls}" seats="${n}" ${solo} buttons='${c.buttons}'`;
      // everyday legends are read whole on any phone from 375px; a long word may be cut short on the smallest
      const whole = width >= 375 && !c.buttons.includes('SPECIAL');
      found.push(...problems(await draw(page, attrs, ''), `${width}px ${attrs}`, { whole }));
    }
  }
  assert.deepEqual(found, []);
});

test('landscape: the controls stand in the gutters, clear of each other', async () => {
  const page = await browser.newPage(), found = [];
  for (const [width, height] of LANDSCAPE) {
    await page.setViewportSize({ width, height });
    for (const c of CASES) {
      const [n, solo = ''] = c.seats.split(' ');
      const attrs = `layout="landscape" controls="${c.controls}" seats="${n}" ${solo} buttons='${c.buttons}'`;
      found.push(...problems(await draw(page, attrs, 'position:fixed;inset:0'), `${width}x${height} ${attrs}`));
    }
  }
  assert.deepEqual(found, []);
});

test('in a real browser a tap presses a button and a drag works the stick', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 300 }, hasTouch: true });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><body style="margin:0"><blip-deck buttons='["FIRE"]'></blip-deck><script>${SCRIPT}
    window.seen = []; addEventListener('blip-input', (e) => seen.push(e.detail.name + (e.detail.down ? ' down' : ' up')));</script></body>`);
  const at = (sel) => page.evaluate((sel) => { const b = document.querySelector('blip-deck').shadowRoot.querySelector(sel).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, sel);
  const cap = await at('.cap');
  await page.touchscreen.tap(cap.x, cap.y);
  const stick = await at('.washer');
  await page.mouse.move(stick.x, stick.y);
  await page.mouse.down();
  await page.mouse.move(stick.x + 40, stick.y, { steps: 4 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => seen), ['button1 down', 'button1 up', 'right down', 'right up']);
  await context.close();
});
