---
name: game-engine
description: "Expert skill for building web-based game engines and games using Three.js, Canvas, WebGL, and TypeScript. Use when asked to create games, build game features, implement game physics, handle collision detection, set up game loops, manage 3D objects, add game controls, or work with rendering. Covers techniques for scene management, procedural audio, particle effects, and touch controls."
---

# Game Engine

Build web-based games using Three.js, HTML5 Canvas, WebGL, and TypeScript. This skill covers game loops, scene management, 3D rendering, audio, effects, and input handling.

## When to Use This Skill

- Building game features or game mechanics
- Implementing game loops, physics, or collision detection
- Working with Three.js for 3D game graphics
- Adding game controls (keyboard, mouse, touch)
- Creating particle effects or animations
- Adding procedural audio (Web Audio API)
- Optimizing game performance

## Core Concepts

### Game Loop

Every game revolves around the game loop — a continuous cycle of:

1. **Process Input** - Read keyboard, mouse, touch, or gamepad input
2. **Update State** - Update game object positions, physics, AI, and logic
3. **Render** - Draw the current game state to the screen

Use `requestAnimationFrame` for smooth, browser-optimized rendering. Cap delta time to prevent large jumps (e.g., `Math.min(dt, 0.1)`).

### 3D Rendering (Three.js)

- **Scene graph** - Organize objects in a hierarchy using `THREE.Group`
- **Camera** - Use `PerspectiveCamera` with proper aspect ratio (`window.innerWidth / window.innerHeight`)
- **Lighting** - Combine `AmbientLight` and `DirectionalLight` for even illumination
- **Materials** - Use `MeshStandardMaterial` for PBR rendering
- **Procedural geometry** - Build objects from `CircleGeometry`, `ShapeGeometry`, `PlaneGeometry`, etc.
- **Textures from Canvas** - Use `CanvasTexture` for dynamic text/numbers

### Controls

- **Pointer events** - Use `pointerdown`/`pointermove`/`pointerup` for unified mouse+touch
- **Raycasting** - Use `THREE.Raycaster` for picking objects in 3D
- **Touch** - Mobile touch events and `touch-action: manipulation`

### Audio

- **Web Audio API** - Programmatic sound generation using `OscillatorNode` and `GainNode`
- **Procedural BGM** - Generate background music with chord progressions and melodies
- **SFX** - Short sound effects with frequency sweeps, arpeggios, and chords

### Particle Effects

- **THREE.Points** - Use `BufferGeometry` with position/color attributes
- **Per-particle velocity** - Store in array, apply gravity each frame
- **Opacity fade** - Reduce material opacity over lifetime
- **Cleanup** - Remove from scene and dispose geometry/material when done

## Step-by-Step Workflows

### Adding a New Game Feature

1. Define the feature's data types in `src/types/index.ts`
2. Create config/data in `src/game/config/`
3. Implement game logic in `src/game/systems/`
4. Build 3D visuals in `src/game/entities/`
5. Create UI components in `src/ui/`
6. Integrate in the appropriate scene
7. Write tests in `tests/game/`
8. Verify with `npm run test` and `npm run build`

### Performance Optimization

- Profile with browser dev tools
- Reduce draw calls by merging geometries
- Use object pooling for frequently created/destroyed objects
- Dispose Three.js resources (geometry, material, texture) when removing objects
- Only animate properties that don't trigger layout: `transform` and `opacity`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Canvas is blank | Check renderer setup, camera position, and that objects are within view frustum |
| Game runs at different speeds | Use delta time in update calculations instead of fixed values |
| Collision detection is inconsistent | Use continuous collision detection or reduce time steps |
| Audio does not play | Browsers require user interaction before playing audio; trigger from click handler |
| Performance is poor | Profile with dev tools, reduce draw calls, use object pooling |
| Touch controls are unresponsive | Prevent default touch behavior, handle pointer events |
| Clock appears elliptical | Ensure camera aspect ratio matches `window.innerWidth / window.innerHeight` |
| Canvas 2D context null in tests | Mock `HTMLCanvasElement.prototype.getContext` in Vitest/jsdom |
