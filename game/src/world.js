// The world: one level's state, the thief, the guards, the loot and the
// exit. Pure logic — no drawing, no sound — so the same code runs the live
// game and the staged screenshot scenes.

import {
  ALERT_CHASE,
  CATCH_DISTANCE,
  LEVELS,
  LEVEL_CLEAR_BONUS,
  LOOT_SCORE,
  PLAYER_BODY_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  STEP,
  UNSEEN_BONUS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { createGuard, stepGuard } from './guards.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CHASE = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_EXIT_OPEN = 16;
export const EVENT_LEVEL_CLEAR = 32;
export const EVENT_GAME_WIN = 64;

const WALL_MARGIN = 14; // the room's outer walls, in from the view's edge

// True when a circle at (x, y) with this radius overlaps the rectangle.
export function circleHitsRect(x, y, radius, rects) {
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    if ((x - nearestX) * (x - nearestX) + (y - nearestY) * (y - nearestY) < radius * radius) return true;
  }
  return false;
}

// True when the segment from (x1, y1) to (x2, y2) crosses any rectangle.
export function segmentBlockedByRects(x1, y1, x2, y2, rects) {
  for (let index = 0; index < rects.length; index += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, rects[index])) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // A segment crosses a rectangle unless it passes wholly to one side of it.
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) {
      const swap = t1;
      t1 = t2;
      t2 = swap;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

function pointInShadow(x, y, shadows) {
  for (let index = 0; index < shadows.length; index += 1) {
    const shadow = shadows[index];
    const nx = (x - shadow.x) / shadow.rx;
    const ny = (y - shadow.y) / shadow.ry;
    if (nx * nx + ny * ny <= 1) return true;
  }
  return false;
}

// Move a circle at (x, y) out of every rectangle it overlaps, along the
// shortest way out. Returns the new position and whether anything moved.
export function pushCircleOutOfRects(x, y, radius, rects) {
  let moved = false;
  for (let index = 0; index < rects.length; index += 1) {
    const rect = rects[index];
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= radius * radius) continue;
    if (distanceSquared > 0.0001) {
      const distance = Math.sqrt(distanceSquared);
      const push = radius - distance;
      x += (dx / distance) * push;
      y += (dy / distance) * push;
    } else {
      // The centre is inside the rectangle: leave by the nearest face.
      const left = x - rect.x + radius;
      const right = rect.x + rect.w - x + radius;
      const top = y - rect.y + radius;
      const bottom = rect.y + rect.h - y + radius;
      const smallest = Math.min(left, right, top, bottom);
      if (smallest === left) x = rect.x - radius;
      else if (smallest === right) x = rect.x + rect.w + radius;
      else if (smallest === top) y = rect.y - radius;
      else y = rect.y + rect.h + radius;
    }
    moved = true;
  }
  return { x, y, moved };
}

export function createWorld(random) {
  const world = {
    random,
    levelIndex: 0,
    level: LEVELS[0],
    player: { x: 70, y: 530, facing: -Math.PI / 2, sneaking: false, inShadow: false, moving: false, stepClock: 0 },
    guards: [],
    loot: [],
    blockers: [],
    score: 0,
    lootTaken: 0,
    lootTotal: 0,
    exitOpen: false,
    wasChased: false,
    levelClear: false,
    gameWon: false,
    caught: false,
    time: 0,

    loadLevel(index) {
      this.levelIndex = index;
      this.level = LEVELS[index];
      const level = this.level;
      this.player.x = level.playerStart.x;
      this.player.y = level.playerStart.y;
      this.player.facing = -Math.PI / 2;
      this.player.sneaking = false;
      this.player.inShadow = false;
      this.player.moving = false;
      this.guards = level.guards.map(createGuard);
      this.loot = level.loot.map((spot) => ({ x: spot.x, y: spot.y, taken: false }));
      this.blockers = [...level.walls, ...level.crates];
      this.lootTaken = 0;
      this.lootTotal = this.loot.length;
      this.exitOpen = false;
      this.levelClear = false;
      this.caught = false;
    },

    reset() {
      this.score = 0;
      this.wasChased = false;
      this.gameWon = false;
      this.time = 0;
      this.loadLevel(0);
    },

    // One fixed step of play. `direction` is [dx, dy] (unit or zero).
    step(step, direction, sneaking, demo) {
      if (this.caught || this.levelClear || this.gameWon) return EVENT_NONE;
      let events = EVENT_NONE;
      this.time += step;
      const player = this.player;
      const speed = sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
      player.sneaking = sneaking;
      player.moving = direction[0] !== 0 || direction[1] !== 0;
      if (player.moving) {
        player.facing = Math.atan2(direction[1], direction[0]);
        let nextX = player.x + direction[0] * speed * step;
        let nextY = player.y + direction[1] * speed * step;
        nextX = Math.max(WALL_MARGIN + PLAYER_BODY_RADIUS, Math.min(VIEW_WIDTH - WALL_MARGIN - PLAYER_BODY_RADIUS, nextX));
        nextY = Math.max(WALL_MARGIN + PLAYER_BODY_RADIUS, Math.min(VIEW_HEIGHT - WALL_MARGIN - PLAYER_BODY_RADIUS, nextY));
        // Push the thief out of any wall or crate it overlaps, along the
        // shortest way out: this is what lets it slide around corners
        // instead of snagging on them.
        for (let pass = 0; pass < 3; pass += 1) {
          const pushed = pushCircleOutOfRects(nextX, nextY, PLAYER_BODY_RADIUS, this.blockers);
          nextX = pushed.x;
          nextY = pushed.y;
          if (!pushed.moved) break;
        }
        player.x = nextX;
        player.y = nextY;
        player.stepClock += step * (sneaking ? 0.6 : 1);
      }
      player.inShadow = pointInShadow(player.x, player.y, this.level.shadows);

      // Lanterns: walk close to take one.
      for (let index = 0; index < this.loot.length; index += 1) {
        const item = this.loot[index];
        if (!item.taken && Math.hypot(item.x - player.x, item.y - player.y) < 26) {
          item.taken = true;
          this.lootTaken += 1;
          this.score += LOOT_SCORE;
          events |= EVENT_PICKUP;
          if (this.lootTaken === this.lootTotal && !this.exitOpen) {
            this.exitOpen = true;
            events |= EVENT_EXIT_OPEN;
          }
        }
      }

      // Guards see, grow suspicious, chase — and catch a thief they reach.
      let highestAlert = 0;
      for (let index = 0; index < this.guards.length; index += 1) {
        const guard = this.guards[index];
        const result = stepGuard(guard, step, player, this.blockers);
        if (result === 'spotted') events |= EVENT_SPOTTED;
        if (result === 'chase') {
          events |= EVENT_CHASE;
          this.wasChased = true;
        }
        if (guard.alert > highestAlert) highestAlert = guard.alert;
        if (!demo && guard.alert >= ALERT_CHASE
          && Math.hypot(guard.x - player.x, guard.y - player.y) < CATCH_DISTANCE) {
          this.caught = true;
          events |= EVENT_CAUGHT;
        }
      }
      this.highestAlert = highestAlert;

      // The exit: step into the green door once it is open.
      if (this.exitOpen) {
        const exit = this.level.exit;
        if (player.x > exit.x - 6 && player.x < exit.x + exit.w + 6
          && player.y > exit.y - 6 && player.y < exit.y + exit.h + 6) {
          this.score += LEVEL_CLEAR_BONUS;
          if (!this.wasChased) this.score += UNSEEN_BONUS;
          if (this.levelIndex + 1 >= LEVELS.length) {
            this.gameWon = true;
            events |= EVENT_GAME_WIN;
          } else {
            this.levelClear = true;
            events |= EVENT_LEVEL_CLEAR;
          }
        }
      }
      return events;
    },

    nextLevel() {
      this.loadLevel(this.levelIndex + 1);
    },
  };
  world.reset();
  return world;
}

// The world's own step size, for the loop in main.js.
export { STEP };
