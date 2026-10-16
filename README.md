# NEON SWARM

**A neon arcade game built as an end-to-end Open Machine demo.**

[Open Machine](https://github.com/OpenMachineLabs/openmachine) connects AI-assisted workflows to real development environments and tools. This public repository is the starting point for a recorded coding challenge: turn one game idea into a playable, tested, reviewed, and merged project.

> **Status: Playable implementation.** The original starter challenge is now implemented with TypeScript, Vite, and Canvas. Run it locally with the commands below. See [development and verification](docs/DEVELOPMENT.md) for architecture, controls, and test coverage.

## The Game

**NEON SWARM** is a compact, top-down survival shooter with a dark neon aesthetic.

The gameplay includes:

- **Movement:** WASD and arrow keys.
- **Enemies:** Waves of enemies that spawn and chase the player.
- **Combat:** Automatic firing at nearby enemies.
- **Feedback:** Health, score, and responsive particle effects.
- **Game loop:** A 60-second survival goal, Game Over, and Restart.

The stack is **TypeScript + Vite + HTML Canvas**, without external art assets, runtime dependencies, remote fonts, or a backend.

## The End-to-End Challenge

The demo aims to show one user request driving a real software development workflow:

1. Implement the playable game.
2. Install dependencies, build the project, and run meaningful automated tests.
3. Launch it in a real browser and verify gameplay interactions.
4. Investigate and fix any issues found.
5. Create a GitHub pull request with the implementation.
6. Inspect the code changes and available CI results.
7. Merge the PR when the checks and repository policies allow it.
8. Open the merged game and demonstrate that it works.

The recording and repository history are intended to make the workflow inspectable. Planned steps are not claims of completed or verified work.

## Getting Started

Use **Node.js 24** (`nvm use`), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Move with WASD/arrows or click a destination. Weapons fire automatically. Use **Space** for Nova Pulse, **P/Escape** to pause, and **R** to restart after a run. Sound is optional.

```sh
npm test          # deterministic simulation and input tests
npm run build    # strict TypeScript check and production bundle
npm run preview  # play the production build locally
```

The starter repository originally had no application scaffold. Its README, license, and Open Machine identity are retained as part of the recorded challenge. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for implementation details and the browser verification checklist.

## About Open Machine

Open Machine is open-source middleware that helps AI assistants interact with real machines and tools, including development workspaces, terminal commands, browsers, and GitHub, subject to configured capabilities and permissions.

Explore the project: **[OpenMachineLabs/openmachine](https://github.com/OpenMachineLabs/openmachine)**.

## License

Released under the [MIT License](LICENSE).
