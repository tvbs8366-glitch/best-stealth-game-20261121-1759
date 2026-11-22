// Lantern Thief: The Quiet Gallery — tuning constants and level layouts.
// A level is a top-down room: outer walls, crates (cover), shadow pools,
// lantern loot, guard patrol routes, the player's start and the exit door.
// Patrol routes are drawn with room to spare around every wall and crate,
// so a guard never has to squeeze past an obstacle.

export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 600;
export const STEP = 1 / 60;
export const BEST_KEY = 'lantern-thief-best';

export const PLAYER_RADIUS = 11;
// The collision circle is a little smaller than the drawn thief, so the
// thief slips around wall corners instead of snagging on them.
export const PLAYER_BODY_RADIUS = 9;
export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 82;
export const GUARD_RADIUS = 12;

export const CONE_RANGE = 185;
export const CONE_HALF_ANGLE = 0.61; // about 35 degrees each side
export const CONE_RANGE_SHADOW = 95; // a thief crouched in shadow is hard to spot
export const CONE_RANGE_SNEAK = 130; // sneaking shrinks how far a guard can see you

export const ALERT_RISE_PER_SECOND = 55; // seen: alert climbs this fast
export const ALERT_RISE_SHADOW = 18; // seen while in shadow: much slower
export const ALERT_FALL_PER_SECOND = 14;
export const ALERT_SUSPICIOUS = 40; // guard walks over to look
export const ALERT_CHASE = 80; // guard runs at the thief
export const CATCH_DISTANCE = 20;

export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 128;
export const GUARD_INVESTIGATE_SPEED = 88;
export const GUARD_WAIT_AT_WAYPOINT = 1.4; // seconds a guard pauses to look around

export const LOOT_SCORE = 100;
export const LEVEL_CLEAR_BONUS = 250;
export const UNSEEN_BONUS = 150; // finishing a level without ever being chased

// One rectangle: { x, y, w, h } in room coordinates.
function rect(x, y, w, h) {
  return { x, y, w, h };
}

export const LEVELS = [
  {
    name: 'The Quiet Gallery',
    hint: 'Slip past the guards. Take every lantern, then reach the green door.',
    playerStart: { x: 70, y: 530 },
    exit: rect(876, 56, 60, 52),
    walls: [
      rect(210, 110, 26, 300),
      rect(430, 300, 26, 200),
      rect(620, 90, 26, 300),
      rect(300, 90, 190, 24),
      rect(690, 470, 190, 24),
    ],
    crates: [
      rect(360, 240, 46, 46),
      rect(500, 430, 46, 46),
      rect(760, 210, 46, 46),
      rect(120, 300, 46, 46),
      rect(770, 350, 46, 46),
    ],
    shadows: [
      { x: 330, y: 420, rx: 85, ry: 55 },
      { x: 560, y: 150, rx: 80, ry: 50 },
      { x: 780, y: 500, rx: 75, ry: 45 },
      { x: 150, y: 130, rx: 70, ry: 45 },
    ],
    loot: [
      { x: 335, y: 130 },
      { x: 560, y: 480 },
      { x: 760, y: 130 },
      { x: 180, y: 480 },
    ],
    guards: [
      { waypoints: [{ x: 280, y: 530 }, { x: 280, y: 180 }, { x: 580, y: 180 }, { x: 580, y: 530 }], speed: 58 },
      { waypoints: [{ x: 700, y: 440 }, { x: 700, y: 70 }, { x: 850, y: 70 }, { x: 850, y: 440 }], speed: 58 },
    ],
  },
  {
    name: 'The Marble Hall',
    hint: 'Two more guards, longer sightlines. Shadows are your friends.',
    playerStart: { x: 70, y: 530 },
    exit: rect(876, 56, 60, 52),
    walls: [
      rect(180, 90, 26, 240),
      rect(180, 400, 26, 120),
      rect(420, 90, 26, 260),
      rect(420, 430, 26, 90),
      rect(660, 150, 26, 260),
      rect(660, 470, 26, 60),
      rect(300, 300, 130, 24),
      rect(560, 120, 130, 24),
    ],
    crates: [
      rect(350, 150, 46, 46),
      rect(460, 260, 46, 46),
      rect(800, 300, 46, 46),
      rect(330, 460, 46, 46),
      rect(560, 450, 46, 46),
      rect(830, 120, 46, 46),
    ],
    shadows: [
      { x: 330, y: 480, rx: 80, ry: 50 },
      { x: 560, y: 330, rx: 85, ry: 50 },
      { x: 800, y: 420, rx: 75, ry: 45 },
      { x: 140, y: 200, rx: 65, ry: 45 },
      { x: 480, y: 60, rx: 70, ry: 40 },
    ],
    loot: [
      { x: 330, y: 120 },
      { x: 560, y: 250 },
      { x: 760, y: 90 },
      { x: 140, y: 430 },
      { x: 880, y: 500 },
    ],
    guards: [
      { waypoints: [{ x: 270, y: 540 }, { x: 270, y: 60 }, { x: 530, y: 60 }, { x: 530, y: 540 }], speed: 66 },
      { waypoints: [{ x: 740, y: 480 }, { x: 740, y: 200 }, { x: 880, y: 200 }, { x: 880, y: 480 }], speed: 66 },
      { waypoints: [{ x: 120, y: 60 }, { x: 120, y: 540 }, { x: 230, y: 540 }, { x: 230, y: 60 }], speed: 60 },
    ],
  },
  {
    name: 'The Vault of Lanterns',
    hint: 'Four guards, quick eyes. Take it slow, stay in the dark.',
    playerStart: { x: 70, y: 530 },
    exit: rect(876, 56, 60, 52),
    walls: [
      rect(170, 80, 24, 220),
      rect(170, 380, 24, 140),
      rect(380, 140, 24, 260),
      rect(380, 470, 24, 50),
      rect(580, 80, 24, 220),
      rect(580, 380, 24, 140),
      rect(770, 140, 24, 260),
      rect(250, 300, 120, 22),
      rect(640, 470, 120, 22),
      rect(470, 90, 120, 22),
    ],
    crates: [
      rect(320, 180, 44, 44),
      rect(500, 210, 44, 44),
      rect(710, 370, 44, 44),
      rect(300, 460, 44, 44),
      rect(490, 460, 44, 44),
      rect(880, 300, 44, 44),
      rect(880, 130, 44, 44),
    ],
    shadows: [
      { x: 300, y: 480, rx: 80, ry: 50 },
      { x: 530, y: 330, rx: 85, ry: 50 },
      { x: 720, y: 90, rx: 70, ry: 45 },
      { x: 120, y: 200, rx: 65, ry: 45 },
      { x: 880, y: 330, rx: 60, ry: 45 },
      { x: 480, y: 520, rx: 75, ry: 40 },
    ],
    loot: [
      { x: 300, y: 100 },
      { x: 500, y: 150 },
      { x: 700, y: 250 },
      { x: 130, y: 440 },
      { x: 660, y: 520 },
      { x: 880, y: 420 },
    ],
    guards: [
      { waypoints: [{ x: 230, y: 540 }, { x: 230, y: 120 }, { x: 450, y: 120 }, { x: 450, y: 540 }], speed: 74 },
      { waypoints: [{ x: 680, y: 440 }, { x: 680, y: 120 }, { x: 850, y: 120 }, { x: 850, y: 440 }], speed: 74 },
      { waypoints: [{ x: 120, y: 60 }, { x: 120, y: 540 }, { x: 230, y: 540 }, { x: 230, y: 60 }], speed: 68 },
      { waypoints: [{ x: 440, y: 540 }, { x: 850, y: 540 }, { x: 850, y: 60 }, { x: 440, y: 60 }], speed: 68 },
    ],
  },
];
