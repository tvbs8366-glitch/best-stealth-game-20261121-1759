// Keyboard and mouse input: WASD or arrow keys to walk, Shift to sneak,
// Space or Enter to confirm, P to pause, R to restart. A mouse click sets a
// walk-to target; any key press cancels it.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const KEY_DIRECTIONS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const held = new Set();
  let queuedActions = 0;
  let clickTarget = null;

  function keyDown(event) {
    if (event.code === 'Space' || event.code === 'Enter') {
      queuedActions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP') {
      queuedActions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      queuedActions |= ACTION_RESTART;
    } else if (KEY_DIRECTIONS[event.code]) {
      held.add(event.code);
      clickTarget = null;
      event.preventDefault();
    }
  }

  function keyUp(event) {
    held.delete(event.code);
  }

  function mouseDown(event) {
    const box = canvas.getBoundingClientRect();
    const scaleX = canvas.width / box.width;
    const scaleY = canvas.height / box.height;
    clickTarget = {
      x: (event.clientX - box.left) * scaleX,
      y: (event.clientY - box.top) * scaleY,
    };
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);

  // The held-key direction, normalised; [0, 0] when no movement key is held.
  function keyDirection() {
    let x = 0;
    let y = 0;
    for (const code of held) {
      const step = KEY_DIRECTIONS[code];
      if (step) {
        x += step[0];
        y += step[1];
      }
    }
    if (x === 0 && y === 0) return [0, 0];
    const length = Math.hypot(x, y);
    return [x / length, y / length];
  }

  return {
    // [dx, dy] from the keys, else a direction toward the click target.
    moveDirection(playerX, playerY) {
      const keys = keyDirection();
      if (keys[0] !== 0 || keys[1] !== 0) return keys;
      if (!clickTarget) return [0, 0];
      const dx = clickTarget.x - playerX;
      const dy = clickTarget.y - playerY;
      const distance = Math.hypot(dx, dy);
      if (distance < 6) {
        clickTarget = null;
        return [0, 0];
      }
      return [dx / distance, dy / distance];
    },
    isSneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    clearClickTarget() {
      clickTarget = null;
    },
    // One-shot actions since the last call (confirm, pause, restart).
    takeActions() {
      const actions = queuedActions;
      queuedActions = 0;
      return actions;
    },
  };
}
