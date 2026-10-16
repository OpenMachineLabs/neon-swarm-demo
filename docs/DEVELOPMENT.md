# Development and verification

NEON SWARM is a client-only TypeScript + Vite + Canvas game. There are no runtime packages, external art assets, remote fonts, analytics, accounts, or backend.

## Run locally

Use Node 24 (`nvm use` when nvm is installed), then:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Production validation and preview:

```sh
npm test
npm run build
npm run preview
```

## Controls

WASD or arrow keys move. Clicking/tapping the arena sets a destination; keyboard input cancels that destination. Weapons automatically target the nearest enemy within range. Space or the Nova Pulse button clears nearby enemies and pushes back others, with an eight-second recharge. P/Escape pauses. R restarts after victory or defeat. Switching tabs or leaving the window pauses the run and clears held input. Sound is optional and synthesized only after a user gesture.

Survive 60 active simulation seconds. Pink stalkers pursue steadily, amber runners are faster, and violet tanks require three hits. Threat escalates every 15 seconds. Every twelfth kill drops a repair; nearby repairs are magnetized toward the pilot. Chain kills increase the score multiplier, but damage or three seconds without a kill resets the chain.

## Architecture

- `src/game.ts`: deterministic, DOM-independent simulation and one-shot events.
- `src/math.ts`: geometry, swept collision, and seeded randomness.
- `src/input.ts`: keyboard/pointer coordinate mapping and steering.
- `src/render.ts`: high-DPI Canvas rendering with bounded particles and reduced-motion support.
- `src/audio.ts`: optional local Web Audio synthesis.
- `src/main.ts`: browser lifecycle, semantic HUD, overlays, and best-score persistence.

The frame delta is capped at 50 ms, so stalled/background tabs cannot fast-forward the challenge. Lethal contact on the final simulation step takes precedence over victory. Health never goes below zero or above 100; pickups cannot resurrect a defeated player. Effects and concurrent enemies have explicit caps.

## Automated checks

Vitest covers state transitions, timing, movement normalization, both keyboard layouts, pointer scaling, spawning/chasing, auto-targeting, swept collision, tank health, score/combo, damage immunity, repair pickups, pulse recharge, particle bounds, event draining, and seeded full-run balance. These deterministic simulations are unit tests, not substitutes for actual browser play.

GitHub Actions runs `npm ci`, `npm test`, and `npm run build` on pull requests and pushes to main, retaining the production build as an artifact. The build includes strict TypeScript checking.

## Browser verification checklist

Use a real visible Chrome window. Verify the start screen; keyboard and pointer movement; automatic firing and kills; damage; pulse; pause/resume; a complete 60-second victory; Game Over; and clean restart from both outcomes. Inspect desktop and narrow-window layouts. Keep observations and limitations separate from automated test results.

Local recording artifacts and command logs belong in ignored `.demo/`. Do not commit credentials, browser profiles, or claims of checks not actually performed. The original MIT license and Open Machine repository identity must remain intact.
