// A tiny seeded random generator (mulberry32) so a ?seed=N run always plays the same way.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a seeded generator.
export function randomRange(random, min, max) {
  return min + random() * (max - min);
}
