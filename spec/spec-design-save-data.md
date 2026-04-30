---
title: "Save Data & Trophy System Specification"
version: 1.0
date_created: 2026-04-30
tags: [design, storage, save-data, trophies]
---

# Introduction

localStorage ベースのセーブデータ管理とトロフィー（実績）システムの仕様。進捗保存、ベストスコア、トロフィー獲得条件を定義する。

## 1. Purpose & Scope

本仕様は SaveManager のデータスキーマ、永続化ロジック、トロフィー獲得条件、データバリデーションを定義する。

## 2. Definitions

| 用語 | 定義 |
|------|------|
| SaveData | localStorage に保存されるゲーム進捗データの型 |
| Trophy | 特定条件を達成すると獲得できる実績バッジ |
| completedLevels | 正解率60%以上でクリアしたレベルの記録 |
| bestScores | 各モード×レベルの最高正解数 |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: ゲーム進捗は localStorage に JSON 形式で永続化する
- **REQ-002**: データ読み込み時にバリデーションを行い、不正データはデフォルト値にフォールバックする
- **REQ-003**: レベルクリア（正解率 ≥ 60%）を記録する
- **REQ-004**: トロフィーは全問正解（100%）で獲得できる
- **REQ-005**: ベストスコアは既存値より高い場合のみ更新する
- **REQ-006**: completedLevels と trophies に重複エントリを追加しない
- **REQ-007**: セーブデータの初期化（クリア）ができる

### Constraints

- **CON-001**: localStorage のみ使用（IndexedDB, Cookie 不使用）
- **CON-002**: ストレージキーは `'kids-clock-master-save'` 固定

### Security

- **SEC-001**: localStorage データはクライアントサイドのみ — サーバー送信なし
- **SEC-002**: JSON.parse のエラーは try-catch で処理し、デフォルト値にフォールバック

## 4. Interfaces & Data Contracts

### SaveData スキーマ

```typescript
interface SaveData {
  completedLevels: Record<GameMode, number[]>;
  trophies: string[];
  totalCorrect: number;
  totalPlays: number;
  bestScores: Record<string, number>;
}
```

### デフォルト値

```typescript
{
  completedLevels: { quiz: [], setTime: [], daily: [] },
  trophies: [],
  totalCorrect: 0,
  totalPlays: 0,
  bestScores: {}
}
```

### バリデーション（isValid）

以下すべてが true の場合に有効:
- `data` が null でなくオブジェクトである
- `completedLevels` がオブジェクトである
- `trophies` が配列である
- `totalCorrect` が number である
- `totalPlays` が number である
- `bestScores` がオブジェクトである

### SaveManager メソッド

| メソッド | シグネチャ | 動作 |
|---------|-----------|------|
| `load()` | `(): SaveData` | localStorage から読み込み、バリデーション、無効時はデフォルト値 |
| `save(data)` | `(data: SaveData): void` | JSON.stringify して localStorage に保存 |
| `addCompletedLevel` | `(mode: GameMode, level: number): void` | 重複なしで completedLevels に追加 |
| `addTrophy` | `(trophyId: string): void` | 重複なしで trophies に追加 |
| `updateBestScore` | `(key: string, correct: number): void` | `correct > 既存値` の場合のみ更新 |
| `incrementStats` | `(correct: number): void` | totalCorrect += correct, totalPlays++ |
| `clear()` | `(): void` | localStorage.removeItem |

### bestScores キー形式

```
"${mode}-${level}"
```

例: `"quiz-1"`, `"setTime-3"`, `"daily-1"`

### トロフィー定義（9種）

| ID | ラベル | Emoji | 獲得条件 |
|----|--------|-------|---------|
| quiz-1-perfect | なんじかな？ レベル1 | 🥉 | Quiz L1 全問正解 |
| quiz-2-perfect | なんじかな？ レベル2 | 🥈 | Quiz L2 全問正解 |
| quiz-3-perfect | なんじかな？ レベル3 | 🥇 | Quiz L3 全問正解 |
| quiz-4-perfect | なんじかな？ レベル4 | 🏆 | Quiz L4 全問正解 |
| setTime-1-perfect | じかんあわせ レベル1 | 🥉 | SetTime L1 全問正解 |
| setTime-2-perfect | じかんあわせ レベル2 | 🥈 | SetTime L2 全問正解 |
| setTime-3-perfect | じかんあわせ レベル3 | 🥇 | SetTime L3 全問正解 |
| setTime-4-perfect | じかんあわせ レベル4 | 🏆 | SetTime L4 全問正解 |
| daily-1-perfect | いちにちチャレンジ | 👑 | Daily 全問正解 |

### トロフィーID 形式

```
"${mode}-${level}-perfect"
```

### 結果保存フロー（ResultScene）

```
1. ratio = correct / total
2. if ratio >= 0.6 && mode !== 'daily':
     addCompletedLevel(mode, level)
3. if mode === 'daily' && ratio >= 0.6:
     addCompletedLevel('daily', 1)
4. updateBestScore("${mode}-${level}", correct)
5. incrementStats(correct)
6. if ratio === 1.0:
     addTrophy("${mode}-${level}-perfect")
```

## 5. Acceptance Criteria

- **AC-001**: Given 初回起動, When load(), Then デフォルト値が返る
- **AC-002**: Given データを save, When load(), Then 保存した値が返る
- **AC-003**: Given addCompletedLevel(quiz, 1) を2回呼ぶ, When load(), Then quiz に [1] のみ
- **AC-004**: Given addTrophy を同じ ID で2回, When load(), Then 1エントリのみ
- **AC-005**: Given bestScore=3 で updateBestScore(key, 2), When load(), Then 3 のまま
- **AC-006**: Given bestScore=3 で updateBestScore(key, 5), When load(), Then 5 に更新
- **AC-007**: Given incrementStats(3) を2回, When load(), Then totalCorrect=6, totalPlays=2
- **AC-008**: Given clear(), When load(), Then デフォルト値が返る
- **AC-009**: Given localStorage に不正 JSON, When load(), Then デフォルト値（クラッシュなし）

## 6. Test Automation Strategy

- **テスト**: `tests/game/storage/SaveManager.test.ts`（8テスト）
- **前処理**: `beforeEach(() => localStorage.clear())`
- **テスト項目**:
  - デフォルトデータ返却
  - save/load ラウンドトリップ
  - completedLevels 重複防止
  - trophies 重複防止
  - bestScores の条件付き更新
  - incrementStats の累積
  - clear 動作
  - 不正データのフォールバック

## 7. Rationale & Context

- localStorage は子供向けゲームの永続化に十分（サーバー同期不要）
- バリデーションによりブラウザのデータ破損や手動編集に対する耐性を確保
- bestScores を separate record にすることでモード×レベルの組み合わせを柔軟に拡張可能
- トロフィーはコレクション要素として継続的なプレイのモチベーションを提供

## 8. Dependencies & External Integrations

### Technology Platform Dependencies

- **PLT-001**: Web Storage API — `localStorage.getItem()`, `localStorage.setItem()`, `localStorage.removeItem()`

## 9. Examples & Edge Cases

```typescript
const sm = new SaveManager();

// 基本操作
sm.addCompletedLevel('quiz', 1);
sm.addTrophy('quiz-1-perfect');
sm.updateBestScore('quiz-1', 5);
sm.incrementStats(5);

const data = sm.load();
// {
//   completedLevels: { quiz: [1], setTime: [], daily: [] },
//   trophies: ['quiz-1-perfect'],
//   totalCorrect: 5,
//   totalPlays: 1,
//   bestScores: { 'quiz-1': 5 }
// }

// クリア
sm.clear();
sm.load(); // デフォルト値
```

**Edge Cases:**
- localStorage が無効（プライベートブラウジング等）→ `try-catch` でデフォルト値にフォールバック
- 別のアプリが同キーを使用 → バリデーションで検出しデフォルト値に
- `JSON.parse` が例外 → catch でデフォルト値
- `bestScores` のキーが存在しない場合 → `?? 0` で初期値扱い

## 10. Validation Criteria

- `npm run test` の SaveManager テスト（8テスト）全通過
- ブラウザリロード後に進捗が保持される
- DevTools の Application > Local Storage で保存内容を目視確認

## 11. Related Specifications

- [spec-design-quiz-system.md](spec-design-quiz-system.md) — 結果評価ロジック（保存トリガー）
- [spec-architecture-game-core.md](spec-architecture-game-core.md) — SaveManager の DI
