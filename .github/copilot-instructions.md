# Copilot Instructions — Kids Clock Master (とけいマスター)

Clock-reading learning game for kids (ages 5–10). Built with Three.js + TypeScript + Vite.

## Commands

```bash
npm run dev                           # Dev server at http://localhost:5173/watch-game/
npm run build                         # tsc + vite build → dist/
npm run test                          # Run all tests (vitest run)
npm run test:watch                    # Watch mode
npx vitest run tests/game/systems/QuizGenerator.test.ts  # Single test file
```

## Architecture

- **Scene state machine**: `SceneManager` holds `Map<SceneType, Scene>`. Each scene implements `enter(ctx)` / `update(dt)` / `exit()` / `getThreeScene()` / `getCamera()`. Scenes are registered in `main.ts`.
- **Manual DI**: All dependencies are constructor-injected in `main.ts`. No DI container.
- **UI = DOM over Canvas**: UI elements are created as HTML with inline `style.cssText` (no CSS files). Components follow a `mount(parent)` / `unmount()` lifecycle.
- **Procedural audio**: BGM and SFX are generated via Web Audio API at runtime. No audio files.
- **Procedural 3D**: The clock (`Clock3D`) is built programmatically with Three.js. No external 3D models.
- **Game loop**: `GameLoop` drives `update(dt)` → `render()` using `requestAnimationFrame`.

## Conventions

- **Path alias**: `@/*` → `./src/*` (configured in tsconfig, vite, and vitest)
- **Types**: All shared types live in `src/types/index.ts` (barrel file)
- **File names**: PascalCase (`Clock3D.ts`, `QuizGenerator.ts`)
- **Styling**: No CSS files. Use `element.style.cssText` with `clamp()` for responsive sizing.
- **Language**: UI text is Japanese; code identifiers are English
- **Tests**: Vitest + jsdom environment with `globals: true`. Tests mirror `src/game/` structure under `tests/game/`. Canvas 2D context must be mocked.

## Key Patterns

- **Adding a scene**: Implement the `Scene` interface → register in `main.ts` via `sceneManager.register()` → add to `SceneType` union in `src/types/index.ts`
- **Adding an effect**: Use `THREE.Points` + `BufferGeometry` pattern (see `CorrectEffect.ts`)
- **Adding SFX**: Add case to `SFXGenerator.play()` switch → add to `SFXType` union
- **Changing save data**: Update `SaveData` type → add default in `SaveManager.defaultData()` → add validation in `isValid()`
