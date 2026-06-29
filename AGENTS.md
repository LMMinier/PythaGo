# PythaGo engineering rules

- Keep Expo Go compatibility on Expo SDK 56.
- Phaser runs inside an Expo DOM component.
- Python runs in a resettable Web Worker and loads the pinned Pyodide runtime from jsDelivr.
- Never expose secrets to the DOM component or Python namespace.
- Every lesson needs starter code, objective, hint, deterministic tests, and a visible game reaction.
- Preserve portrait mobile usability at 360×640 and larger.
- Run `npm run typecheck` and `npm run export:web` before publishing.
