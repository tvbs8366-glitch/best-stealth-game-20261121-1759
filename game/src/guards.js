// Guard patrols and eyesight: a guard walks its waypoints, looks around at
// each one, and watches a cone in front of it. Seeing the thief raises the
// guard's alert: suspicious (walk over and look), then chase (run at the
// thief). Walls and crates block sight; shadows and sneaking shrink the cone.

import {
  ALERT_CHASE,
  ALERT_FALL_PER_SECOND,
  ALERT_RISE_PER_SECOND,
  ALERT_RISE_SHADOW,
  ALERT_SUSPICIOUS,
  CONE_HALF_ANGLE,
  CONE_RANGE,
  CONE_RANGE_SHADOW,
  CONE_RANGE_SNEAK,
  GUARD_CHASE_SPEED,
  GUARD_INVESTIGATE_SPEED,
  GUARD_PATROL_SPEED,
  GUARD_WAIT_AT_WAYPOINT,
} from './config.js';
import { pushCircleOutOfRects, segmentBlockedByRects } from './world.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_CHASE = 'chase';

// A guard's cone only reaches this far against this player right now.
export function guardSightRange(playerInShadow, playerSneaking) {
  if (playerInShadow) return CONE_RANGE_SHADOW;
  if (playerSneaking) return CONE_RANGE_SNEAK;
  return CONE_RANGE;
}

// True when the guard can see the player: close enough, inside the cone's
// angle, and with no wall or crate between them.
export function guardCanSee(guard, playerX, playerY, blockers, playerInShadow, playerSneaking) {
  const dx = playerX - guard.x;
  const dy = playerY - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > guardSightRange(playerInShadow, playerSneaking)) return false;
  if (distance < 26) return true; // bumping into a guard is always noticed
  const angleToPlayer = Math.atan2(dy, dx);
  let difference = angleToPlayer - guard.facing;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  if (Math.abs(difference) > CONE_HALF_ANGLE) return false;
  return !segmentBlockedByRects(guard.x, guard.y, playerX, playerY, blockers);
}

function turnToward(guard, targetAngle, turnSpeed, step) {
  let difference = targetAngle - guard.facing;
  while (difference > Math.PI) difference -= Math.PI * 2;
  while (difference < -Math.PI) difference += Math.PI * 2;
  const turn = Math.max(-turnSpeed * step, Math.min(turnSpeed * step, difference));
  guard.facing += turn;
  return Math.abs(difference) < 0.05;
}

function slideMove(x, y, moveX, moveY, blockers) {
  let nextX = x + moveX;
  let nextY = y + moveY;
  // Slide around walls and crates instead of stopping at their corners.
  for (let pass = 0; pass < 3; pass += 1) {
    const pushed = pushCircleOutOfRects(nextX, nextY, 12, blockers);
    nextX = pushed.x;
    nextY = pushed.y;
    if (!pushed.moved) break;
  }
  return { x: nextX, y: nextY };
}

function walkToward(guard, targetX, targetY, speed, step, blockers) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) {
    guard.slideSide = 0;
    return true;
  }
  const targetAngle = Math.atan2(dy, dx);
  const move = Math.min(distance, speed * step);

  if (guard.slideSide !== 0) {
    // Sidestepping around an obstacle: keep walking along the wall until the
    // way toward the target opens up again.
    const sideAngle = targetAngle + (guard.slideSide > 0 ? Math.PI / 2 : -Math.PI / 2);
    const along = slideMove(guard.x, guard.y, Math.cos(sideAngle) * move, Math.sin(sideAngle) * move, blockers);
    if (Math.hypot(along.x - guard.x, along.y - guard.y) < 0.05) {
      // This way is shut too (a corner): go around the other way.
      guard.slideSide = -guard.slideSide;
      return false;
    }
    // Probe: can the guard turn toward the target from here?
    const probe = slideMove(along.x, along.y, Math.cos(targetAngle) * move, Math.sin(targetAngle) * move, blockers);
    const probeProgress = Math.hypot(targetX - along.x, targetY - along.y) - Math.hypot(targetX - probe.x, targetY - probe.y);
    if (probeProgress >= move * 0.3) {
      guard.slideSide = 0;
      guard.x = probe.x;
      guard.y = probe.y;
      guard.facing = targetAngle;
    } else {
      guard.x = along.x;
      guard.y = along.y;
      guard.facing = sideAngle;
    }
    return distance <= move + 2;
  }

  const facingTarget = turnToward(guard, targetAngle, 6, step);
  if (!facingTarget) return false;
  const forward = slideMove(guard.x, guard.y, Math.cos(guard.facing) * move, Math.sin(guard.facing) * move, blockers);
  const forwardProgress = distance - Math.hypot(targetX - forward.x, targetY - forward.y);
  if (forwardProgress >= move * 0.3) {
    guard.x = forward.x;
    guard.y = forward.y;
  } else {
    // Pressed flat against a wall or crate: pick a side to go around and
    // remember it, so the guard keeps going that way instead of jittering.
    const perp = guard.facing + Math.PI / 2;
    const left = slideMove(guard.x, guard.y, Math.cos(perp) * move, Math.sin(perp) * move, blockers);
    const right = slideMove(guard.x, guard.y, -Math.cos(perp) * move, -Math.sin(perp) * move, blockers);
    const leftDistance = Math.hypot(targetX - left.x, targetY - left.y);
    const rightDistance = Math.hypot(targetX - right.x, targetY - right.y);
    guard.slideSide = leftDistance <= rightDistance ? 1 : -1;
    const sideAngle = guard.facing + (guard.slideSide > 0 ? Math.PI / 2 : -Math.PI / 2);
    const side = guard.slideSide > 0 ? left : right;
    const moved = Math.hypot(side.x - guard.x, side.y - guard.y);
    guard.x = side.x;
    guard.y = side.y;
    if (moved > 0.05) guard.facing = sideAngle;
  }
  return distance <= move + 2;
}

export function createGuard(definition) {
  const start = definition.waypoints[0];
  const second = definition.waypoints[1] || start;
  return {
    x: start.x,
    y: start.y,
    facing: Math.atan2(second.y - start.y, second.x - start.x),
    waypoints: definition.waypoints,
    waypointIndex: 1 % definition.waypoints.length,
    waitLeft: 0,
    speed: definition.speed || GUARD_PATROL_SPEED,
    state: GUARD_PATROL,
    alert: 0,
    lastSeenX: start.x,
    lastSeenY: start.y,
    investigateX: start.x,
    investigateY: start.y,
    lookAround: 0,
    slideSide: 0, // +1 or -1 while sidestepping around an obstacle; 0 when free
  };
}

// Advance one guard one step. Returns 'spotted' the moment the guard's alert
// crosses into suspicious, 'chase' when it crosses into chase, else ''.
export function stepGuard(guard, step, player, blockers) {
  const seen = guardCanSee(guard, player.x, player.y, blockers, player.inShadow, player.sneaking);
  const wasAlert = guard.alert;
  if (seen) {
    guard.lastSeenX = player.x;
    guard.lastSeenY = player.y;
    const rise = player.inShadow ? ALERT_RISE_SHADOW : ALERT_RISE_PER_SECOND;
    guard.alert = Math.min(100, guard.alert + rise * step);
  } else {
    guard.alert = Math.max(0, guard.alert - ALERT_FALL_PER_SECOND * step);
  }
  const previousState = guard.state;
  if (guard.alert >= ALERT_CHASE) guard.state = GUARD_CHASE;
  else if (guard.alert >= ALERT_SUSPICIOUS) guard.state = GUARD_SUSPICIOUS;
  else if (guard.state !== GUARD_PATROL && guard.alert < ALERT_SUSPICIOUS * 0.5) guard.state = GUARD_PATROL;
  if (guard.state === GUARD_SUSPICIOUS && previousState !== GUARD_SUSPICIOUS) {
    guard.investigateX = guard.lastSeenX;
    guard.investigateY = guard.lastSeenY;
  }

  if (guard.state === GUARD_CHASE) {
    walkToward(guard, player.x, player.y, GUARD_CHASE_SPEED, step, blockers);
  } else if (guard.state === GUARD_SUSPICIOUS) {
    const arrived = walkToward(guard, guard.investigateX, guard.investigateY, GUARD_INVESTIGATE_SPEED, step, blockers);
    if (arrived) {
      // Look around the spot for a while, then give up and go back on patrol.
      guard.lookAround += step;
      guard.facing += step * 1.6;
      if (guard.lookAround > 2.2) {
        guard.lookAround = 0;
        guard.state = GUARD_PATROL;
        guard.alert = Math.max(0, ALERT_SUSPICIOUS * 0.4);
      }
    }
  } else {
    if (guard.waitLeft > 0) {
      guard.waitLeft -= step;
      guard.facing += step * 0.9; // glance around while waiting
    } else {
      const target = guard.waypoints[guard.waypointIndex];
      const arrived = walkToward(guard, target.x, target.y, guard.speed, step, blockers);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.waitLeft = GUARD_WAIT_AT_WAYPOINT;
      }
    }
  }

  if (wasAlert < ALERT_CHASE && guard.alert >= ALERT_CHASE) return 'chase';
  if (wasAlert < ALERT_SUSPICIOUS && guard.alert >= ALERT_SUSPICIOUS) return 'spotted';
  return '';
}
