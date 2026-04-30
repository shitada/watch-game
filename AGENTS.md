# AGENTS.md — Kids Clock Master

## Overview

5〜10歳向けの時計学習ゲーム「とけいマスター」。Three.js + TypeScript + Vite で構築。

## Commands

```bash
npm run dev          # 開発サーバー (http://localhost:5173/watch-game/)
npm run build        # tsc + vite build → dist/
npm run test         # vitest run (全テスト)
npm run test:watch   # vitest watch mode
```

## Architecture

- **Scene state machine**: `SceneManager` が `Map<SceneType, Scene>` でシーン管理。`enter(ctx)` / `update(dt)` / `exit()` ライフサイクル。
- **Manual DI**: 全依存は `main.ts` でコンストラクタ注入。DI コンテナなし。
- **UI = DOM over Canvas**: UI は HTML 要素を `style.cssText` でインライン生成。CSS ファイルなし。`mount(parent)` / `unmount()` パターン。
- **Procedural audio**: BGM / SFX は Web Audio API で生成。音声ファイルなし。
- **3D**: Three.js でプロシージャルに時計を構築（`Clock3D`）。外部3Dモデルなし。

## Directory Layout

```
src/game/config/    — 設定定数・レベル定義（純粋データ）
src/game/entities/  — 3Dオブジェクト（Clock3D）
src/game/scenes/    — シーン（1クラス=1ファイル、Scene インターフェース実装）
src/game/systems/   — ゲームロジック（QuizGenerator, TimeValidator, ClockController）
src/game/effects/   — パーティクルエフェクト
src/game/audio/     — AudioManager / BGMGenerator / SFXGenerator
src/game/storage/   — SaveManager (localStorage)
src/ui/             — DOM UI コンポーネント
src/types/index.ts  — 全型定義のバレルファイル
tests/game/         — src/game/ のミラー構造
```

## Conventions

- **ファイル名**: PascalCase（`Clock3D.ts`, `QuizGenerator.ts`）
- **パスエイリアス**: `@/*` → `./src/*`（tsconfig / vite / vitest 共通）
- **型**: `src/types/index.ts` に集約
- **スタイリング**: CSS ファイル不使用。`element.style.cssText` + `clamp()` でレスポンシブ
- **テスト**: Vitest + jsdom、`tests/game/` にソースのミラー構造。Canvas 2D コンテキストは mock 必須
- **言語**: UI テキストは日本語、コード識別子は英語

## Key Patterns

- **新しいシーンの追加**: `Scene` インターフェース実装 → `main.ts` で `sceneManager.register()` → `SceneType` に型追加
- **新しいエフェクト**: `THREE.Points` + `BufferGeometry` パターン（`CorrectEffect.ts` 参照）
- **新しい SFX**: `SFXGenerator.play()` の switch に追加、`SFXType` に型追加
- **セーブデータ変更**: `SaveData` 型を更新 → `SaveManager.defaultData()` にデフォルト値追加 → `isValid()` にバリデーション追加

## 自動改善システム

シェルスクリプト + オーケストレーターによる自動改善ループ。

### 使い方

```bash
./scripts/auto-improve.sh       # 1回実行
./scripts/auto-improve.sh 3     # 3回ループ
```

### パイプライン構成

```
auto-improve.sh → Orchestrator
  → Proposer (コード分析・改善提案)
  → Reviewer (提案の批評・フィルタリング)
  → Coder (TDD実装・ビルド・コミット)
  → Tester (全テスト実行・結果報告)
  → Evaluator (品質ゲート・PR作成)
```

### エージェント一覧

| エージェント | ファイル | 役割 |
|---|---|---|
| Orchestrator | `.github/agents/orchestrator.agent.md` | チームリーダー。サブエージェントの呼び出しと検証 |
| Proposer | `.github/agents/proposer.agent.md` | コードベース分析 → 1件の改善提案 |
| Reviewer | `.github/agents/reviewer.agent.md` | 提案の批評。blocker/warning/suggestion で品質フィルタ |
| Coder | `.github/agents/coder.agent.md` | TDD で実装、ビルド+テスト検証、コミット |
| Tester | `.github/agents/tester.agent.md` | 全テスト実行、リスク別テスト分類 |
| Evaluator | `.github/agents/evaluator.agent.md` | ハードゲート判定、セキュリティチェック、PR作成 |

### スキル

| スキル | ファイル | 用途 |
|---|---|---|
| security-review | `.github/skills/security-review/SKILL.md` | セキュリティ監査（Evaluator が使用） |
| quality-playbook | `.github/skills/quality-playbook/SKILL.md` | 品質基準生成（Proposer が使用） |

### ログ

各実行のログは `logs/auto-improve/YYYYMMDD_HHMMSS/` に保存される（.gitignore 済み）。

### Constitution

プロジェクトの最上位ルールは `spec/constitution.md` に定義。
全ての自動改善は Constitution に準拠しなければならない。
