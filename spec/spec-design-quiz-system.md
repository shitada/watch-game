---
title: "Quiz System Specification"
version: 1.0
date_created: 2026-04-30
tags: [design, quiz, game-logic, levels]
---

# Introduction

3つのゲームモード（なんじかな？/じかんをあわせよう！/いちにちチャレンジ）のクイズ出題・判定ロジックの仕様。レベル定義、問題生成アルゴリズム、時刻判定ロジック、日課イベントデータを含む。

## 1. Purpose & Scope

本仕様はクイズの出題、回答、正誤判定に関する全てのゲームロジックを定義する。UI やエフェクトは含まない。

## 2. Definitions

| 用語 | 定義 |
|------|------|
| ClockTime | `{ hours: 1-12, minutes: 0-59 }` |
| QuizResult | `{ questionIndex, targetTime, answerTime, correct }` |
| tolerance | 正解とみなす許容誤差（分単位） |
| minuteStep | そのレベルで使う分の刻み幅 |
| 正時 | 分が 0 の時刻（例: 3:00） |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: 4段階のレベルで難易度が上がる（正時 → 30分 → 5分 → 1分）
- **REQ-002**: モード1（なんじかな？）は4択から正解を選ぶ
- **REQ-003**: モード2（じかんをあわせよう！）は針をドラッグして時刻を合わせる
- **REQ-004**: モード3（いちにちチャレンジ）は8つの生活イベントの時刻を順番に合わせる
- **REQ-005**: 正解率 60% 以上でレベルクリア、100% でトロフィー獲得
- **REQ-006**: 不正解時に正解を表示する
- **REQ-007**: 4択の選択肢は重複せず、正解に近すぎないこと

### Constraints

- **CON-001**: 12時間制のみ（午前/午後の区別なし）
- **CON-002**: 1問あたり 1500ms の結果表示後に次の問題へ自動遷移

## 4. Interfaces & Data Contracts

### レベル定義

| Level | name | description | minuteStep | questionCount | tolerance |
|-------|------|-------------|-----------|---------------|-----------|
| 1 | レベル１ | 〜じ（ちょうどのじかん） | 60 | 5 | 15分 |
| 2 | レベル２ | 〜じはん（30ぷんたんい） | 30 | 5 | 10分 |
| 3 | レベル３ | 〜じ〜ふん（5ふんたんい） | 5 | 8 | 3分 |
| 4 | レベル４ | 〜じ〜ぷん（1ぷんたんい） | 1 | 10 | 1分 |

### 日課イベント定義

| ID | name | emoji | time |
|----|------|-------|------|
| breakfast | あさごはん | 🍚 | 7:00 |
| school | がっこう | 🏫 | 8:30 |
| lunch | きゅうしょく | 🍱 | 12:00 |
| cleaning | そうじ | 🧹 | 1:30 |
| homeroom | かえりのかい | 👋 | 3:00 |
| snack | おやつ | 🍪 | 3:30 |
| bath | おふろ | 🛁 | 6:30 |
| bedtime | ねるじかん | 🌙 | 9:00 |

日課モードの tolerance: **15分**

### 問題生成アルゴリズム（QuizGenerator）

**`generateTime(level)`:**
1. hours = `Math.floor(Math.random() * 12) + 1`（1〜12 均等分布）
2. minuteStep >= 60 の場合: minutes = 0
3. それ以外: steps = 60 / minuteStep, step = random(0..steps-1), minutes = step × minuteStep

**`generateChoices(correct, level)`:**
1. choices = [correct]
2. 最大100回試行で3つの不正解を追加:
   - 同レベルで generateTime
   - 正解と同一なら skip
   - minuteStep ≤ 5 のとき: 差が minuteStep×2 未満なら skip
   - 既存の選択肢と重複なら skip
3. Fisher-Yates シャッフル
4. 4要素配列を返す

### 時刻フォーマット（formatTime）

```
minutes === 0  → "${hours}時"      例: "3時"
minutes === 30 → "${hours}時半"    例: "7時半"
その他        → "${hours}時${minutes}分"  例: "2時15分"
```

### 時刻判定ロジック（TimeValidator）

**`validate(target, answer, toleranceMinutes)`:**
```
targetTotal = target.hours × 60 + target.minutes
answerTotal = answer.hours × 60 + answer.minutes
diff = abs(targetTotal - answerTotal)
wrappedDiff = min(diff, 720 - diff)    // 12時間ラップアラウンド
return wrappedDiff <= toleranceMinutes
```

### 結果評価（ResultScene）

| 正解率 | 星 | メッセージ | トロフィー |
|--------|-----|---------|-----------|
| 100% | ★★★ | 🎉 パーフェクト！すごい！ | `${mode}-${level}-perfect` |
| ≥ 80% | ★★☆ | 👏 とてもよくできました！ | — |
| ≥ 60% | ★☆☆ | 😊 よくがんばったね！ | — |
| < 60% | ☆☆☆ | 💪 もういちど チャレンジしよう！ | — |

レベルクリア条件: 正解率 ≥ 60%

### スナップステップ対応表（SetTimePlay/DailyPlay）

| レベル | minuteStep | ClockController snapStep |
|--------|-----------|------------------------|
| 1 | 60 | 30 |
| 2 | 30 | 30 |
| 3 | 5 | 5 |
| 4 | 1 | 1 |
| daily | — | 30 |

## 5. Acceptance Criteria

- **AC-001**: Given レベル1, When generateTime, Then minutes は必ず 0
- **AC-002**: Given レベル2, When generateTime, Then minutes は 0 または 30
- **AC-003**: Given レベル3, When generateTime, Then minutes は 5 の倍数
- **AC-004**: Given 正解 3:00, When generateChoices, Then 4つの重複なし選択肢で正解を含む
- **AC-005**: Given target=3:00, answer=3:10, tolerance=15, When validate, Then true
- **AC-006**: Given target=3:00, answer=3:20, tolerance=15, When validate, Then false
- **AC-007**: Given target=12:55, answer=1:05, tolerance=15, When validate, Then true（ラップアラウンド）
- **AC-008**: Given 5問中3問正解（60%）, When 結果判定, Then レベルクリア

## 6. Test Automation Strategy

- **QuizGenerator**: `tests/game/systems/QuizGenerator.test.ts`
  - レベル別の時刻生成制約テスト
  - 4択の一意性テスト
  - formatTime のフォーマットテスト
- **TimeValidator**: `tests/game/systems/TimeValidator.test.ts`
  - 完全一致テスト
  - 許容誤差内/外テスト
  - 12時間ラップアラウンドテスト
- **Config**: `tests/game/config/Config.test.ts`
  - レベル数の検証
  - 各レベルのプロパティ妥当性
  - 日課イベント数と時刻妥当性

## 7. Rationale & Context

- 4段階レベルは5〜10歳の時計学習カリキュラムに対応
- レベル1（正時のみ）は年長〜小1、レベル4（1分単位）は小3〜4を想定
- 日課モードは実生活と結びつけた学習体験を提供
- toleranceはレベルが上がるほど厳しくなる（15→10→3→1分）
- 1500ms の結果表示は子供が結果を認識するための最低限の時間

## 8. Dependencies & External Integrations

なし（純粋なゲームロジック、外部サービス不使用）

## 9. Examples & Edge Cases

```typescript
// レベル1: 正時のみ
generateTime(1) → { hours: 7, minutes: 0 }

// レベル3: 5分刻み
generateTime(3) → { hours: 11, minutes: 35 }

// 12時間ラップアラウンド
validate({ hours: 12, minutes: 55 }, { hours: 1, minutes: 5 }, 15)
// diff = |755 - 65| = 690, wrapped = min(690, 30) = 30 → false (30 > 15)
```

**Edge Cases:**
- 全問同じ時刻が出題される可能性（確率的に極めて低い）
- generateChoices で100回試行しても4択が埋まらない場合（minuteStep が大きい場合は選択肢が限られる）
- 日課モードの cleaning (1:30) は午後を意味するが、12時間制では区別しない

## 10. Validation Criteria

- 全レベルで generateTime の出力が minuteStep 制約を満たす
- generateChoices が常に4要素で重複なし
- TimeValidator が12時間ラップアラウンドを正しく処理
- `npm run test` の QuizGenerator/TimeValidator/Config テスト全通過

## 11. Related Specifications

- [spec-design-clock3d.md](spec-design-clock3d.md) — 時計表示・操作
- [spec-design-save-data.md](spec-design-save-data.md) — 結果保存・トロフィー
- [spec-architecture-game-core.md](spec-architecture-game-core.md) — シーン遷移
