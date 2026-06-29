# PythaGo: Code Borough

PythaGo is a story-driven mobile game where players learn real Python by restoring a futuristic city. It runs in **Expo Go**, renders the world with **Phaser**, and executes Python locally through **Pyodide/CPython WebAssembly**.

![PythaGo title art](public/game/title-screen.svg)

## Playable vertical slice

The first district includes:

- High-resolution vector player and Byte robot sprites with Phaser animation
- A Phaser city scene with touch movement controls
- Five missions: `print`, variables, `if/else`, loops, and functions
- Real local Python compilation and execution in a resettable Web Worker
- Output capture, syntax/runtime errors, line feedback, test assertions, and a time limit
- Python-to-game actions: `activate()`, `recharge()`, `say()`, and `unlock()`
- XP, mission unlocks, and persistent progress with AsyncStorage
- Pyodide/CPython WebAssembly loaded from the official jsDelivr distribution

## Run with Expo Go

```bash
npm install
npx expo start --clear
```

Scan the QR code with Expo Go.

## Validate

```bash
npm run typecheck
npm run export:web
```

## Architecture

```text
App.tsx                 Native Expo shell and persistence
src/GameDom.tsx         DOM UI, progression, and game loop
src/gameScene.ts        Phaser scene and game reactions
src/pythonRunner.ts     Pyodide worker sandbox
src/lessons.ts          Workshop curriculum and tests
public/game             Generated art and sprites
```

The client sandbox is appropriate for normal educational missions, not adversarial public code execution. Competitive submissions should eventually run inside server-side containers as a second boundary.

## License

MIT for code. Generated artwork is included for use with this project and is not a standalone asset pack.
