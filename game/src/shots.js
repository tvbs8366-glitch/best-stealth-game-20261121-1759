// The screenshot scenes behind ?shot=start|play|spotted|end. Each one stages
// the real world — guards patrol forward, the thief stands where a player
// would be — so the frame is what a short game really looks like, and the
// same seed always gives the same frame.

import { STEP } from './config.js';
import { GUARD_CHASE } from './guards.js';
import { EVENT_GAME_WIN } from './world.js';
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PATROL_SECONDS = 10; // guards walk this long before the play scene
const CHASE_SECONDS = 0.6; // the chasing guard runs this long in the spotted scene

// Let the guards patrol while the thief waits at the start, unseen.
function patrolAhead(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) {
    world.step(STEP, [0, 0], false, true);
  }
}

// Set `world` to the named scene and return the screen to draw over it.
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    patrolAhead(world, PATROL_SECONDS);
    // Mid-level: one lantern already stolen, the thief creeping past a crate
    // toward the next lantern while the guards sweep the gallery.
    const firstLoot = world.loot[0];
    firstLoot.taken = true;
    world.lootTaken = 1;
    world.score = 100;
    world.player.x = 390;
    world.player.y = 470;
    world.player.facing = Math.PI / 4;
    world.player.inShadow = false;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'spotted') {
    patrolAhead(world, PATROL_SECONDS);
    // The alarm moment: the thief stepped into a guard's cone and the guard
    // is running at them, alert meter full, red at the edges.
    world.player.x = 420;
    world.player.y = 380;
    world.player.facing = -Math.PI / 2;
    const guard = world.guards[0];
    guard.x = 300;
    guard.y = 300;
    guard.facing = Math.atan2(350 - 300, 350 - 300);
    guard.alert = 92;
    guard.state = GUARD_CHASE;
    guard.lastSeenX = world.player.x;
    guard.lastSeenY = world.player.y;
    world.highestAlert = 92;
    for (let index = 0; index < CHASE_SECONDS / STEP; index += 1) {
      world.step(STEP, [0, 0], false, true);
    }
    world.highestAlert = 92;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'end') {
    // The win: every lantern taken, the thief stepping through the green door.
    for (const item of world.loot) item.taken = true;
    world.lootTaken = world.lootTotal;
    world.score = world.lootTotal * 100;
    world.exitOpen = true;
    world.player.x = world.level.exit.x + world.level.exit.w / 2;
    world.player.y = world.level.exit.y + world.level.exit.h / 2;
    world.player.facing = -Math.PI / 2;
    const events = world.step(STEP, [0, 0], false, true);
    if (!(events & EVENT_GAME_WIN)) world.gameWon = true;
    return { screen: SCREEN_WIN, best: world.score };
  }
  // Any other name (including 'start') is the title scene.
  patrolAhead(world, 5);
  return { screen: SCREEN_TITLE, best: 0 };
}
