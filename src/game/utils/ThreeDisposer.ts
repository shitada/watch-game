import * as THREE from 'three';

export interface DisposeResult {
  disposedGeometries: number;
  disposedMaterials: number;
  disposedTextures: number;
}

// Walk a THREE.Scene and attempt to dispose geometries, materials and textures.
// This is defensive: each dispose() call is wrapped in try/catch so calling it
// twice or on already-disposed resources won't throw.
export function safeDisposeScene(scene: THREE.Scene | null): DisposeResult {
  const geometries = new Set<any>();
  const materials = new Set<any>();
  const textures = new Set<any>();

  if (!scene) return { disposedGeometries: 0, disposedMaterials: 0, disposedTextures: 0 };

  scene.traverse((obj: any) => {
    try {
      // Mesh / Points / Line objects typically hold geometry & material
      if (obj.geometry) {
        const g = obj.geometry;
        if (g && typeof g.dispose === 'function') geometries.add(g);
      }
      if (obj.material) {
        const m = obj.material;
        if (Array.isArray(m)) {
          for (const mm of m) materials.add(mm);
        } else {
          materials.add(m);
        }
      }
    } catch (e) {
      // ignore traversal errors for robustness
    }
  });

  // Scan materials for textures (common properties like map, alphaMap, envMap, etc.)
  for (const mat of Array.from(materials)) {
    try {
      for (const key of Object.keys(mat)) {
        const val = (mat as any)[key];
        if (!val) continue;
        // Heuristic: a Texture has a dispose() method and usually an image property
        if (typeof val.dispose === 'function') {
          textures.add(val);
        }
      }
    } catch (e) {
      // swallow
    }
  }

  let gCount = 0;
  let mCount = 0;
  let tCount = 0;

  // dispose textures first
  for (const t of textures) {
    try {
      if (typeof t.dispose === 'function') t.dispose();
    } catch (e) {
      // swallow
    }
    tCount++;
  }

  for (const g of geometries) {
    try {
      if (typeof g.dispose === 'function') g.dispose();
    } catch (e) {
      // swallow
    }
    gCount++;
  }

  for (const m of materials) {
    try {
      if (typeof m.dispose === 'function') m.dispose();
    } catch (e) {
      // swallow
    }
    mCount++;
  }

  return { disposedGeometries: gCount, disposedMaterials: mCount, disposedTextures: tCount };
}

// Lightweight DOM cleanup helper to remove all child nodes of an overlay root.
export function safeCleanDOMOverlay(root: HTMLElement | null | undefined): number {
  if (!root) return 0;
  let removed = 0;
  try {
    while (root.firstChild) {
      root.removeChild(root.firstChild);
      removed++;
    }
  } catch (e) {
    // swallow
  }
  return removed;
}
