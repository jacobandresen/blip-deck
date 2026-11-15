import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gate, cross, TUNING } from '../src/gate.js';

test('the stick engages past its threshold and lets go under a smaller one', () => {
  const move = gate(100, 100);
  assert.deepEqual(move(100, 90), []); // 10px: not yet
  assert.deepEqual(move(100, 100 - TUNING.engage - 1), ['up']);
  assert.deepEqual(move(100, 90), ['up']); // 10px still holds once engaged
  assert.deepEqual(move(100, 95), []);
});

test('eight sectors, held a few degrees past their edge', () => {
  const move = gate(0, 0);
  assert.deepEqual(move(30, -30), ['up', 'right']);
  assert.deepEqual(move(30, 0), ['right']);
  assert.deepEqual(move(-30, 30), ['down', 'left']);
  // 25 degrees off "down-left" is inside its 22.5 + 8 degree hold
  const a = (225 - 25) * Math.PI / 180;
  assert.deepEqual(move(30 * Math.sin(a), -30 * Math.cos(a)), ['down', 'left']);
});

test('the centre follows a thumb that strays, so turning back acts at once', () => {
  const move = gate(0, 0, { maxR: 40 });
  assert.deepEqual(move(200, 0), ['right']); // the pivot is now at 160, 0
  assert.deepEqual(move(140, 0), ['left']);
});

test('the cross: four ways and a dead middle; a corner holds two', () => {
  assert.deepEqual(cross(0, 0), []);
  assert.deepEqual(cross(0.9, 0.1), ['right']);
  assert.deepEqual(cross(-0.8, -0.8), ['up', 'left']);
  assert.deepEqual(cross(0.2, 0.9, 0.1), ['down', 'right']);
});
