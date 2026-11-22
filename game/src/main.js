// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between title, play, paused, level-clear, caught and win screens.
//
// ?seed=N fixes the run. ?shot=start|play|spotted|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_CAUGHT,
  EVENT_CHASE,
  EVENT_EXIT_OPEN,
  EVENT_GAME_WIN,
  EVENT_LEVEL_CLEAR,
  EVENT_PICKUP,
  EVENT_SPOTTED,
  createWorld,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  SCREEN_CAUGHT,
  SCREEN_LEVEL_CLEAR,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25; // the longest frame the loop catches up on
const FOOTSTEP_EVERY = 0.38; // seconds between footstep sounds while walking

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastFootstepAt = 0;
  let clicked = false;
  canvas.addEventListener('mousedown', () => {
    clicked = true;
    audio.unlock();
  });
  window.addEventListener('keydown', () => audio.unlock(), { once: true });

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing level 1: ${world.level.name}.`);
  }

  function finishLevel(events) {
    if (events & EVENT_GAME_WIN) {
      screen = SCREEN_WIN;
      audio.playWin();
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      announce(`You stole every lantern. Final score ${world.score}. Best ${best}.`);
    } else if (events & EVENT_LEVEL_CLEAR) {
      screen = SCREEN_LEVEL_CLEAR;
      audio.playDoorUnlock();
      announce(`Level clear. Score ${world.score}.`);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const confirm = (actions & ACTION_CONFIRM) !== 0 || clicked;
    clicked = false;
    if (actions & ACTION_RESTART) {
      if (screen !== SCREEN_TITLE) startGame();
      return;
    }
    if (confirm && screen === SCREEN_TITLE) startGame();
    else if (confirm && screen === SCREEN_LEVEL_CLEAR) {
      world.nextLevel();
      screen = SCREEN_PLAY;
      announce(`Playing level ${world.levelIndex + 1}: ${world.level.name}.`);
    } else if (confirm && (screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) startGame();
    else if ((actions & ACTION_PAUSE) !== 0 && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (((actions & ACTION_PAUSE) !== 0 || confirm) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function stepWorld() {
    if (screen === SCREEN_TITLE) {
      // The gallery idles behind the title: guards on patrol.
      world.step(STEP, [0, 0], false, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const direction = input.moveDirection(world.player.x, world.player.y);
    const sneaking = input.isSneaking();
    const events = world.step(STEP, direction, sneaking, false);
    if (world.player.moving && world.time - lastFootstepAt > FOOTSTEP_EVERY) {
      lastFootstepAt = world.time;
      audio.playFootstep(sneaking);
    }
    if (events & EVENT_PICKUP) audio.playPickup();
    if (events & EVENT_EXIT_OPEN) audio.playDoorUnlock();
    if (events & EVENT_SPOTTED) {
      audio.playSuspicious();
      announce('A guard is suspicious — hide!');
    }
    if (events & EVENT_CHASE) {
      audio.playAlertSting();
      announce('Spotted! A guard is chasing you — break line of sight!');
    }
    if (events & EVENT_CAUGHT) {
      screen = SCREEN_CAUGHT;
      audio.playCaught();
      input.clearClickTarget();
      if (world.score > best) {
        best = world.score;
        saveBest(best);
      }
      announce(`Caught. Score ${world.score}. Best ${best}. Press R to try again.`);
      return;
    }
    if (events & (EVENT_LEVEL_CLEAR | EVENT_GAME_WIN)) {
      input.clearClickTarget();
      finishLevel(events);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      stepWorld();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Lantern Thief. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
