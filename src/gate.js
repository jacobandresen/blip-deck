// The joystick's 8-way restrictor gate, as arithmetic: a drag from where the thumb landed becomes up to two of the
// four directions. No DOM here, so the feel can be tuned and tested on its own.

const SECTORS = [['up'], ['up', 'right'], ['right'], ['down', 'right'], ['down'], ['down', 'left'], ['left'], ['up', 'left']];

/** Engage past 16px, let go under 9px, hold a sector 8 degrees past its edge, and let the centre follow the thumb
 *  when it strays more than 46px, so turning back acts at once. */
export const TUNING = { engage: 16, release: 9, hyst: 8, maxR: 46 };

/** A gate for one drag starting at x, y. move(x, y) returns the directions held, as a list. */
export function gate(x, y, tuning = {}) {
  const t = { ...TUNING, ...tuning };
  const pivot = { x, y };
  let sector = -1;

  return function move(px, py) {
    let dx = px - pivot.x, dy = py - pivot.y;
    const dist = Math.hypot(dx, dy);
    if (dist > t.maxR) {
      pivot.x = px - (dx * t.maxR) / dist;
      pivot.y = py - (dy * t.maxR) / dist;
      dx = px - pivot.x;
      dy = py - pivot.y;
    }
    if (Math.hypot(dx, dy) < (sector < 0 ? t.engage : t.release)) sector = -1;
    else {
      const angle = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
      const off = Math.abs(((angle - sector * 45 + 540) % 360) - 180);
      if (sector < 0 || off > 22.5 + t.hyst) sector = Math.round(angle / 45) % 8;
    }
    return sector < 0 ? [] : SECTORS[sector];
  };
}

/** The cross: four ways from the centre, outside a dead middle (a share of the radius); a corner holds two. */
export function cross(nx, ny, dead = 0.32) {
  return [ny < -dead && 'up', ny > dead && 'down', nx < -dead && 'left', nx > dead && 'right'].filter(Boolean);
}
