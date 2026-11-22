// The renderer: everything the player sees, painted on one canvas — the
// moonlit floor, walls and crates, shadow pools, lantern loot, the exit door,
// guards with their vision cones, the thief, the HUD and the screens.

import {
  ALERT_CHASE,
  ALERT_SUSPICIOUS,
  CONE_HALF_ANGLE,
  LEVELS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { guardSightRange } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_LEVEL_CLEAR = 'level-clear';
export const SCREEN_WIN = 'win';

const FLOOR_A = '#232a3d';
const FLOOR_B = '#1d2334';
const WALL = '#4a5470';
const WALL_TOP = '#5d6884';
const CRATE = '#7a5a34';
const CRATE_TOP = '#96703f';

function drawRoundedRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCone(ctx, guard, range, colour) {
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.facing - CONE_HALF_ANGLE, guard.facing + CONE_HALF_ANGLE);
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
}

function drawGuard(ctx, guard, playerInShadow) {
  const alert = guard.alert;
  const range = guardSightRange(playerInShadow, false);
  const coneColour = alert >= ALERT_CHASE
    ? 'rgba(255, 64, 64, 0.30)'
    : alert >= ALERT_SUSPICIOUS
      ? 'rgba(255, 170, 60, 0.26)'
      : 'rgba(255, 220, 110, 0.20)';
  drawCone(ctx, guard, range, coneColour);
  // Guard body: a watchman in a dark coat with a brass lantern.
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = alert >= ALERT_CHASE ? '#c0392b' : '#8e3b2f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2b1a16';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(guard.x + Math.cos(guard.facing) * 5, guard.y + Math.sin(guard.facing) * 5, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#e8c96a';
  ctx.fill();
  // A small "!" or "?" above a guard who is suspicious or chasing.
  if (alert >= ALERT_SUSPICIOUS) {
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = alert >= ALERT_CHASE ? '#ff5a4e' : '#ffb84d';
    ctx.fillText(alert >= ALERT_CHASE ? '!' : '?', guard.x, guard.y - 24);
  }
}

function drawPlayer(ctx, player, time) {
  // A soft lantern glow around the thief.
  const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 46);
  glow.addColorStop(0, 'rgba(255, 214, 120, 0.35)');
  glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 46, 0, Math.PI * 2);
  ctx.fill();
  // The thief: a hooded figure, teal cloak, bobbing as it walks.
  const bob = player.moving ? Math.sin(player.stepClock * 12) * 1.5 : 0;
  ctx.beginPath();
  ctx.arc(player.x, player.y + bob, 11, 0, Math.PI * 2);
  ctx.fillStyle = player.sneaking ? '#1f7a6d' : '#2ec4a6';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0d3b34';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(player.x + Math.cos(player.facing) * 6, player.y + Math.sin(player.facing) * 6 + bob, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe9a8';
  ctx.fill();
  // A tiny lantern swinging at the thief's side.
  const swing = Math.sin(time * 2.4) * 3;
  ctx.beginPath();
  ctx.arc(player.x - Math.cos(player.facing) * 13, player.y - Math.sin(player.facing) * 13 + swing, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd76a';
  ctx.fill();
}

function drawLantern(ctx, x, y, time) {
  const flicker = 0.75 + Math.sin(time * 3 + x * 0.13) * 0.15;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 26);
  glow.addColorStop(0, `rgba(255, 205, 90, ${0.55 * flicker})`);
  glow.addColorStop(1, 'rgba(255, 205, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffcf4d';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#8a6a1f';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 8);
  ctx.lineTo(x + 5, y - 8);
  ctx.strokeStyle = '#8a6a1f';
  ctx.stroke();
}

function drawExit(ctx, exit, open, time) {
  const pulse = open ? 0.75 + Math.sin(time * 4) * 0.25 : 0.4;
  ctx.fillStyle = open ? `rgba(80, 220, 130, ${pulse})` : 'rgba(90, 110, 90, 0.6)';
  drawRoundedRect(ctx, exit.x, exit.y, exit.w, exit.h, 6);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = open ? '#b8ffcf' : '#5a6e5a';
  ctx.stroke();
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = open ? '#0b3d1e' : '#c8d4c8';
  ctx.fillText(open ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2);
}

function drawHud(ctx, world, best) {
  ctx.fillStyle = 'rgba(10, 13, 22, 0.82)';
  ctx.fillRect(0, 0, VIEW_WIDTH, 44);
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8ecf5';
  ctx.fillText(`Level ${world.levelIndex + 1}/${LEVELS.length} — ${world.level.name}`, 14, 23);
  ctx.fillStyle = '#ffcf4d';
  ctx.fillText(`Lanterns ${world.lootTaken}/${world.lootTotal}`, 330, 23);
  ctx.fillStyle = '#e8ecf5';
  ctx.fillText(`Score ${world.score}`, 480, 23);
  ctx.fillText(`Best ${best}`, 590, 23);
  // The alert meter: the highest alert of any guard.
  const alert = world.highestAlert || 0;
  ctx.fillStyle = '#3a4157';
  drawRoundedRect(ctx, 690, 14, 180, 16, 8);
  ctx.fill();
  const alertColour = alert >= ALERT_CHASE ? '#ff5a4e' : alert >= ALERT_SUSPICIOUS ? '#ffb84d' : '#7ec8ff';
  ctx.fillStyle = alertColour;
  if (alert > 0) {
    drawRoundedRect(ctx, 690, 14, 180 * (alert / 100), 16, 8);
    ctx.fill();
  }
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = '#e8ecf5';
  ctx.textAlign = 'left';
  ctx.fillText(alert >= ALERT_CHASE ? 'ALARM!' : alert >= ALERT_SUSPICIOUS ? 'Suspicious' : 'Alert', 880, 23);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 18, 0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = accent;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.fillText(title, VIEW_WIDTH / 2, 190);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = '#dfe5f2';
  lines.forEach((line, index) => {
    ctx.fillText(line, VIEW_WIDTH / 2, 258 + index * 30);
  });
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(level) {
    for (let row = 0; row < 10; row += 1) {
      for (let col = 0; col < 16; col += 1) {
        ctx.fillStyle = (row + col) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(col * 60, row * 60, 60, 60);
      }
    }
    // Outer walls.
    ctx.fillStyle = WALL;
    ctx.fillRect(0, 0, VIEW_WIDTH, 14);
    ctx.fillRect(0, VIEW_HEIGHT - 14, VIEW_WIDTH, 14);
    ctx.fillRect(0, 0, 14, VIEW_HEIGHT);
    ctx.fillRect(VIEW_WIDTH - 14, 0, 14, VIEW_HEIGHT);
    // Shadow pools: dark patches where a thief is hard to see.
    for (const shadow of level.shadows) {
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(5, 8, 16, 0.55)';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(140, 160, 200, 0.25)';
      ctx.stroke();
    }
    // Inner walls.
    for (const wall of level.walls) {
      ctx.fillStyle = WALL;
      drawRoundedRect(ctx, wall.x, wall.y, wall.w, wall.h, 4);
      ctx.fill();
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(wall.x + 3, wall.y + 3, wall.w - 6, 5);
    }
    // Crates: cover to hide behind.
    for (const crate of level.crates) {
      ctx.fillStyle = CRATE;
      drawRoundedRect(ctx, crate.x, crate.y, crate.w, crate.h, 4);
      ctx.fill();
      ctx.strokeStyle = CRATE_TOP;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(crate.x + 4, crate.y + 4);
      ctx.lineTo(crate.x + crate.w - 4, crate.y + crate.h - 4);
      ctx.moveTo(crate.x + crate.w - 4, crate.y + 4);
      ctx.lineTo(crate.x + 4, crate.y + crate.h - 4);
      ctx.stroke();
      ctx.strokeStyle = '#5d4423';
      drawRoundedRect(ctx, crate.x, crate.y, crate.w, crate.h, 4);
      ctx.stroke();
    }
  }

  return {
    draw(world, screen, best) {
      const level = world.level;
      const time = world.time;
      ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      drawFloor(level);
      drawExit(ctx, level.exit, world.exitOpen, time);
      for (const item of world.loot) {
        if (!item.taken) drawLantern(ctx, item.x, item.y, time);
      }
      for (const guard of world.guards) drawGuard(ctx, guard, world.player.inShadow);
      drawPlayer(ctx, world.player, time);
      // A red wash at the edges while a guard is chasing.
      if ((world.highestAlert || 0) >= ALERT_CHASE && screen === SCREEN_PLAY) {
        const edge = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 220, VIEW_WIDTH / 2, VIEW_HEIGHT / 2, 560);
        edge.addColorStop(0, 'rgba(255, 40, 40, 0)');
        edge.addColorStop(1, 'rgba(255, 40, 40, 0.28)');
        ctx.fillStyle = edge;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      }
      drawHud(ctx, world, best);

      if (screen === SCREEN_TITLE) {
        drawOverlay(ctx, 'Lantern Thief', [
          'The Quiet Gallery',
          'Steal every lantern. Reach the green door unseen.',
          'WASD or arrows to walk · Shift to sneak · Click to walk to a spot',
          'Hide behind crates and in the dark. A guard’s cone is its eyes.',
          'Press Space or click to begin',
        ], '#ffcf4d');
      } else if (screen === SCREEN_PAUSED) {
        drawOverlay(ctx, 'Paused', ['Press P or Space to keep sneaking.'], '#e8ecf5');
      } else if (screen === SCREEN_CAUGHT) {
        drawOverlay(ctx, 'Caught!', [
          `The guards found you on level ${world.levelIndex + 1}.`,
          `Score ${world.score} · Best ${best}`,
          'Press R to try again, or Space to start over.',
        ], '#ff5a4e');
      } else if (screen === SCREEN_LEVEL_CLEAR) {
        drawOverlay(ctx, 'Level Clear!', [
          `${world.level.name} — every lantern taken, and you slipped away.`,
          `Score ${world.score}`,
          'Press Space for the next gallery.',
        ], '#7ee2a0');
      } else if (screen === SCREEN_WIN) {
        drawOverlay(ctx, 'The Quiet Gallery is Yours!', [
          'Every lantern stolen. Every guard outwitted. Not a sound made.',
          `Final score ${world.score} · Best ${best}`,
          'Press R to steal again.',
        ], '#ffcf4d');
      } else if (screen === SCREEN_PLAY && world.levelIndex === 0 && world.time < 6) {
        // A gentle hint at the start of the first level.
        ctx.font = '15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(232, 236, 245, 0.9)';
        ctx.fillText(world.level.hint, VIEW_WIDTH / 2, VIEW_HEIGHT - 24);
      }
    },
  };
}
