// The deck under real input in Chromium: taps, drags, slides and two fingers at once, on every control, as the
// pages using it rely on. Needs Chromium: CHROMIUM=/path/to/chrome, or `npx playwright install chromium`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const SCRIPT = readFileSync(new URL('../../dist/blip-deck.js', import.meta.url), 'utf8');
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); });
after(() => browser?.close());

/** A page with one deck (`attrs`) that logs its events as "name down|up", and helpers to find and press its parts. */
async function deckPage(attrs, { width = 420, height = 320, under = '' } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
  const page = await context.newPage();
  await page.setContent(`<!doctype html><body style="margin:0;background:#000">${under}<blip-deck ${attrs}></blip-deck><script>${SCRIPT}
    window.log = []; addEventListener('blip-input', (e) => log.push({ name: e.detail.name, down: e.detail.down, t: performance.now() }));</script></body>`);
  const cdp = await context.newCDPSession(page);
  const deck = {
    page,
    /** The centre of a part: '1 stick', '2 dpad', '1 button 2' (station, part, nth). */
    at: (spec) => page.evaluate((spec) => {
      const [who, part, n = 1] = spec.split(' ');
      const station = document.querySelector('blip-deck').shadowRoot.querySelectorAll('[part~="station"]')[who - 1];
      const r = station.querySelectorAll(`[part~="${part}"]`)[n - 1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }, spec),
    /** The events so far, as "name down|up", and forget them. */
    events: async () => (await page.evaluate(() => log.splice(0))).map((e) => `${e.name} ${e.down ? 'down' : 'up'}`),
    /** Fingers as [[id, x, y], …]: on the glass for touchStart and touchMove, lifting for touchEnd ([] lifts the rest). */
    touch: (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y })) }),
    settle: () => page.waitForTimeout(40),
    close: () => context.close(),
  };
  return deck;
}

test('a tap on each button presses it, for at least a frame', async () => {
  const d = await deckPage(`buttons='["A","B"]'`);
  for (const n of [1, 2]) {
    const b = await d.at(`1 button ${n}`);
    await d.page.touchscreen.tap(b.x, b.y);
    await d.settle();
    const log = await d.page.evaluate(() => log.splice(0));
    assert.deepEqual(log.map((e) => `${e.name} ${e.down}`), [`button${n} true`, `button${n} false`]);
    assert.ok(log[1].t - log[0].t >= 19, `a ${Math.round(log[1].t - log[0].t)}ms press: a game polling each frame misses it`);
  }
  await d.close();
});

test('the stick drags into all eight directions and leans with them', async () => {
  const d = await deckPage('');
  const s = await d.at('1 stick');
  const ways = { up: [0, -1], 'up right': [1, -1], right: [1, 0], 'down right': [1, 1], down: [0, 1],
    'down left': [-1, 1], left: [-1, 0], 'up left': [-1, -1] };
  for (const [names, [dx, dy]] of Object.entries(ways)) {
    await d.page.mouse.move(s.x, s.y);
    await d.page.mouse.down();
    await d.page.mouse.move(s.x + dx * 40, s.y + dy * 40, { steps: 5 });
    const lean = await d.page.evaluate(() => {
      const st = document.querySelector('blip-deck').shadowRoot.querySelector('[part~="station"]').style;
      return [Math.sign(st.getPropertyValue('--dx')), Math.sign(st.getPropertyValue('--dy'))];
    });
    assert.deepEqual(lean, [dx, dy], `${names}: the ball leans ${lean}`);
    await d.page.mouse.up();
    await d.settle();
    const held = (await d.events()).filter((e) => e.endsWith(' down')).map((e) => e.split(' ')[0]).sort();
    assert.deepEqual(held, names.split(' ').sort(), `dragging ${names} held ${held}`);
  }
  await d.close();
});

test('the cross takes each arm and a corner by touch', async () => {
  const d = await deckPage('controls="pad"');
  const c = await d.at('1 dpad');
  for (const [names, [dx, dy]] of [['up', [0, -1]], ['right', [1, 0]], ['down', [0, 1]], ['left', [-1, 0]], ['up left', [-1, -1]]]) {
    await d.page.touchscreen.tap(c.x + dx * c.w * 0.35, c.y + dy * c.h * 0.35);
    await d.settle();
    const held = (await d.events()).filter((e) => e.endsWith(' down')).map((e) => e.split(' ')[0]).sort();
    assert.deepEqual(held, names.split(' ').sort());
  }
  const centre = await d.at('1 dpad');
  await d.page.touchscreen.tap(centre.x, centre.y); // the dead middle
  await d.settle();
  assert.deepEqual(await d.events(), []);
  await d.close();
});

test('two fingers at once: one works the stick while the other holds a button, and each lets go alone', async () => {
  const d = await deckPage(`buttons='["A","B"]'`);
  const s = await d.at('1 stick'), b = await d.at('1 button 1');
  await d.touch('touchStart', [[1, s.x, s.y]]);
  await d.touch('touchMove', [[1, s.x - 40, s.y]]);
  await d.touch('touchStart', [[1, s.x - 40, s.y], [2, b.x, b.y]]);
  assert.deepEqual(await d.events(), ['left down', 'button1 down']);
  // the stick's finger slides on while the button stays held
  await d.touch('touchMove', [[1, s.x - 40, s.y - 40], [2, b.x, b.y]]);
  assert.deepEqual(await d.events(), ['up down']);
  await d.page.waitForTimeout(30);
  await d.touch('touchEnd', [[1, s.x - 40, s.y - 40]]); // the stick's finger lifts
  await d.settle();
  assert.deepEqual((await d.events()).sort(), ['left up', 'up up']);
  await d.touch('touchEnd', []);
  await d.settle();
  assert.deepEqual(await d.events(), ['button1 up']);
  await d.close();
});

test('a finger slides from one button to the next', async () => {
  const d = await deckPage(`buttons='["A","B"]'`);
  const [a, b] = [await d.at('1 button 1'), await d.at('1 button 2')];
  await d.touch('touchStart', [[1, a.x, a.y]]);
  await d.page.waitForTimeout(30);
  await d.touch('touchMove', [[1, b.x, b.y]]);
  await d.page.waitForTimeout(30);
  await d.touch('touchEnd', []);
  await d.settle();
  assert.deepEqual(await d.events(), ['button1 down', 'button1 up', 'button2 down', 'button2 up']);
  await d.close();
});

test('station two has its own names, and is deaf while idle (solo)', async () => {
  for (const solo of [false, true]) {
    const d = await deckPage(`seats="2" ${solo ? 'solo' : ''} buttons='["A","B"]'`, { width: 700 });
    for (const spec of ['2 button 1', '2 button 2']) {
      const p = await d.at(spec);
      await d.page.touchscreen.tap(p.x, p.y);
    }
    const s = await d.at('2 stick');
    await d.page.mouse.move(s.x, s.y);
    await d.page.mouse.down();
    await d.page.mouse.move(s.x + 40, s.y, { steps: 4 });
    await d.page.mouse.up();
    await d.settle();
    const downs = (await d.events()).filter((e) => e.endsWith(' down'));
    assert.deepEqual(downs, solo ? [] : ['p2button1 down', 'p2button2 down', 'p2right down']);
    await d.close();
  }
});

test('sideways, a touch between the controls reaches the page under the deck', async () => {
  const under = `<button id="under" style="position:fixed;inset:0" onclick="window.clicked = true">game</button>`;
  const d = await deckPage(`layout="landscape" buttons='["A"]' style="position:fixed;inset:0"`, { width: 844, height: 390, under });
  await d.page.touchscreen.tap(422, 195);
  assert.equal(await d.page.evaluate(() => window.clicked), true, 'the middle of the screen is not the game\'s');
  const b = await d.at('1 button 1');
  await d.page.touchscreen.tap(b.x, b.y);
  await d.settle();
  assert.deepEqual(await d.events(), ['button1 down', 'button1 up']);
  await d.close();
});

test('screen readers find every part by role and name, in the page\'s language, and hear presses', async () => {
  const d = await deckPage(`seats="2" buttons='["FIRE","JUMP"]'`, { width: 700 });
  const { page } = d;
  for (const [role, name] of [['group', 'Player 1'], ['group', 'Player 2'], ['group', 'Joystick'], ['button', 'FIRE'], ['button', 'JUMP']])
    assert.ok(await page.getByRole(role, { name, exact: true }).first().count(), `no ${role} "${name}"`);
  const fire = page.getByRole('button', { name: 'FIRE' }).first();
  const b = await d.at('1 button 1');
  await d.touch('touchStart', [[1, b.x, b.y]]);
  assert.equal(await fire.getAttribute('aria-pressed'), 'true');
  await page.waitForTimeout(30);
  await d.touch('touchEnd', []);
  await d.settle();
  assert.equal(await fire.getAttribute('aria-pressed'), 'false');
  await page.evaluate(() => { document.querySelector('blip-deck').labels = { player: 'Spieler {n}', pad: 'Steuerkreuz' }; });
  assert.ok(await page.getByRole('group', { name: 'Spieler 2' }).count());
  await page.evaluate(() => document.querySelector('blip-deck').setAttribute('controls', 'pad'));
  assert.ok(await page.getByRole('group', { name: 'Steuerkreuz' }).first().count());
  await d.close();
});

test('two fingers on the pad: the cross stays held while a button goes down and up, and slides to the other side', async () => {
  const d = await deckPage(`controls="pad" buttons='["A"]'`);
  const c = await d.at('1 dpad'), b = await d.at('1 button 1');
  const right = [1, c.x + c.w * 0.35, c.y], left = [1, c.x - c.w * 0.35, c.y];
  await d.touch('touchStart', [right]);
  await d.touch('touchStart', [right, [2, b.x, b.y]]);
  assert.deepEqual(await d.events(), ['right down', 'button1 down']);
  await d.page.waitForTimeout(30);
  await d.touch('touchEnd', [[2, b.x, b.y]]); // the button's finger lifts
  await d.settle();
  assert.deepEqual(await d.events(), ['button1 up'], 'lifting the button let go of the cross too');
  await d.touch('touchMove', [left]);
  await d.settle();
  assert.deepEqual(await d.events(), ['right up', 'left down']);
  await d.touch('touchEnd', []);
  await d.settle();
  assert.deepEqual(await d.events(), ['left up']);
  await d.close();
});
