# Lantern Thief: The Quiet Gallery

[![make.fun bounty](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/tvbs8366-glitch/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/tvbs8366-glitch/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A top-down 2D stealth game. You are a thief in a moonlit gallery: steal
every lantern, slip past the patrolling guards and their vision cones, hide
behind crates and in shadow pools, and reach the green exit door unseen.
Three galleries of rising difficulty, a suspicion-to-chase alert system, and
synthesised sound effects — no audio files, no network, no build step.

## How to play

- **WASD / arrow keys** — walk; **Shift** — sneak (slower, harder to spot)
- **Click** — walk to that spot
- **Space / Enter** — start, continue; **P** — pause; **R** — restart
- A guard's cone is its eyesight. Walls and crates block it; shadows shrink
  it. Get spotted and the guard investigates, then chases. Break line of
  sight to cool the alarm down.

## How to run

Serve the `game/` folder with any static server and open `index.html`, for
example:

```sh
cd game
python3 -m http.server 8080
```

then open http://localhost:8080 in desktop Chrome. Or open
`game/index.html` directly from a static server of your choice.
