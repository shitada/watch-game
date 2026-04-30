---
title: "Kids Clock Master — Game Architecture Specification"
version: 1.0
date_created: 2026-04-30
tags: [architecture, game, threejs, typescript]
---

# Introduction

Kids Clock Master（とけいマスター）のゲームアーキテクチャ仕様。Scene ベースのステートマシン、手動 DI、DOM-over-Canvas UI、プロシージャルオーディオで構成される Three.js + TypeScript + Vite ゲーム。

## 1. Purpose & Scope

本仕様書はゲーム全体のアーキテクチャ — シーン管理、ゲームループ、依存関係注入、レンダリング、UI レイヤー構造、ライフサイクル管理 — を定義する。対象はこのプロジェクトに関わる開発者および AI エージェント。

## 2. Definitions

| 用語 | 定義 |
|------|------|
| Scene | `enter/update/exit/getThreeScene/getCamera` を実装するゲーム画面の単位 |
| SceneType | `'title' \| 'modeSelect' \| 'levelSelect' \| 'quizPlay' \| 'setTimePlay' \| 'dailyPlay' \| 'result' \| 'trophy'` |
| GameMode | `'quiz' \| 'setTime' \| 'daily'` |
| SceneContext | シーン間で渡すデータ `{ mode?, level?, results? }` |
| DI | Dependency Injection（手動コンストラクタ注入） |
| DOM-over-Canvas | Three.js Canvas の上に HTML 要素を重ねる UI 方式 |
| RAF | `requestAnimationFrame` |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: ゲームは Scene インターフェースを実装するシーンの状態遷移で構成される
- **REQ-002**: 各シーンは独自の `THREE.Scene` と `THREE.Camera` を所有する
- **REQ-003**: 依存関係はすべて `main.ts` でコンストラクタ注入される（DI コンテナ不使用）
- **REQ-004**: UI 要素は HTML DOM で構成し、CSS ファイルは使用しない（`style.cssText` のみ）
- **REQ-005**: ゲームループは RAF ベースで、delta time は 100ms 上限でキャップする
- **REQ-006**: ウィンドウリサイズ時に全シーンのカメラアスペクト比を更新する
- **REQ-007**: タブ非表示時にゲームループを一時停止し、BGM を停止する

### Constraints

- **CON-001**: 本番依存は Three.js のみ（フレームワークなし）
- **CON-002**: 外部 3D モデル、音声ファイル、CSS ファイルは使用しない
- **CON-003**: iPad Safari 横向きプレイを主要ターゲットとする
- **CON-004**: ピクセル比は `Math.min(window.devicePixelRatio, 2)` に制限する

### Guidelines

- **GUD-001**: ファイル名は PascalCase（`Clock3D.ts`, `QuizGenerator.ts`）
- **GUD-002**: パスエイリアス `@/*` → `./src/*` を使用する
- **GUD-003**: 全型定義は `src/types/index.ts` に集約する
- **GUD-004**: UI テキストは日本語、コード識別子は英語

## 4. Interfaces & Data Contracts

### Scene Interface

```typescript
interface Scene {
  enter(context: SceneContext): void;
  update(deltaTime: number): void;
  exit(): void;
  getThreeScene(): THREE.Scene;
  getCamera(): THREE.Camera;
}
```

### SceneContext

```typescript
interface SceneContext {
  mode?: GameMode;
  level?: number;
  results?: QuizResult[];
}
```

### Bootstrap Sequence（main.ts）

1. `WebGLRenderer` 生成（canvas: `#game-canvas`, antialias, SRGBColorSpace）
2. シングルトン生成: `SceneManager`, `GameLoop`, `AudioManager`, `SFXGenerator`, `SaveManager`
3. 全8シーンのインスタンス生成（コンストラクタ注入）
4. `SetTimePlayScene`/`DailyPlayScene` に `renderer` を注入
5. 全シーンを `SceneManager.register()` で登録
6. `transitionHandler` を設定
7. `'title'` シーンで開始
8. `gameLoop.start(onUpdate, onRender)` でループ開始
9. `resize`/`visibilitychange` イベントリスナー登録

### DOM レイヤー構造（index.html）

| レイヤー | 要素 | z-index | 用途 |
|---------|------|---------|------|
| Canvas | `<canvas id="game-canvas">` | — | Three.js 3D レンダリング |
| HUD | `<div id="hud">` | 10 | ゲーム中の HUD（pointer-events: none） |
| UI Overlay | `<div id="ui-overlay">` | 20 | メニュー・ボタン（pointer-events: none） |

### シーン遷移マップ

```
title → modeSelect → levelSelect → quizPlay → result
                                  → setTimePlay → result
                   → dailyPlay → result
      → trophy
result → (retry) → quizPlay/setTimePlay/dailyPlay
       → modeSelect
       → title
```

## 5. Acceptance Criteria

- **AC-001**: アプリ起動時に TitleScene が表示され、3D 時計が回転する
- **AC-002**: 各シーン遷移時に前シーンの `exit()` → 次シーンの `enter()` が呼ばれる
- **AC-003**: ウィンドウリサイズ時にレンダラーサイズと全カメラのアスペクト比が更新される
- **AC-004**: タブを非表示にするとゲームループが停止し、BGM が止まる
- **AC-005**: タブを再表示するとゲームループが再開し、BGM が再開する

## 6. Test Automation Strategy

- **テストフレームワーク**: Vitest + jsdom（`globals: true`）
- **テスト構造**: `tests/game/` が `src/game/` のミラー構造
- **Mock 戦略**:
  - Canvas 2D コンテキスト: `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')`
  - RAF: `vi.spyOn(window, 'requestAnimationFrame')`
  - localStorage: `beforeEach(() => localStorage.clear())`
- **実行**: `npm run test`（単発）、`npm run test:watch`（監視モード）
- **CI**: GitHub Actions で `npm ci → npm run test → npm run build`

## 7. Rationale & Context

- Scene パターンは kids-crane-catch（同作者の前作）のアーキテクチャを踏襲
- 手動 DI はプロジェクト規模（8シーン）に対して DI コンテナがオーバーエンジニアリングであるため
- DOM-over-Canvas は子供向けの大きなタッチ対応ボタンを Three.js テキストより容易に実現できるため
- プロシージャル生成（3D・音声）は外部アセットなしでデプロイを簡潔にするため

## 8. Dependencies & External Integrations

### Technology Platform Dependencies

- **PLT-001**: Three.js ^0.170.0 — 3D レンダリングエンジン
- **PLT-002**: TypeScript ^5.7.0 — ES2022 ターゲット
- **PLT-003**: Vite ^6.0.0 — ビルドツール
- **PLT-004**: Vitest ^3.0.0 — テストフレームワーク

### Infrastructure Dependencies

- **INF-001**: GitHub Pages — 静的ホスティング（base path: `/watch-game/`）
- **INF-002**: GitHub Actions — CI/CD（main ブランチ push 時に自動デプロイ）
- **INF-003**: Google Fonts — Zen Maru Gothic フォント（CDN）

## 9. Examples & Edge Cases

```typescript
// シーン遷移の例
sceneManager.requestTransition('quizPlay', {
  mode: 'quiz',
  level: 2,
});

// delta time キャップの例
const dt = Math.min((now - lastTime) / 1000, 0.1);
// 500ms の遅延があっても dt = 0.1 に制限される
```

**Edge Cases:**
- 初回起動時 `AudioManager` 未初期化 → ボタンクリック時に `init()` を呼び出す
- ブラウザがバックグラウンドタブを throttle → `visibilitychange` で明示的に pause/resume
- ピクセル比が高いデバイス → `Math.min(dpr, 2)` で GPU 負荷を制限

## 10. Validation Criteria

- `npm run build` がエラーなしで完了すること
- `npm run test` が全テスト通過すること
- iPad Safari 横向きでタッチ操作が正常に動作すること
- シーン遷移が全パスで正しく動作すること

## 11. Related Specifications

- [spec-design-clock3d.md](spec-design-clock3d.md) — 3D 時計仕様
- [spec-design-quiz-system.md](spec-design-quiz-system.md) — クイズシステム仕様
- [spec-design-audio.md](spec-design-audio.md) — オーディオ仕様
- [spec-design-save-data.md](spec-design-save-data.md) — セーブデータ仕様
