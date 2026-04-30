---
title: "Clock3D Entity & ClockController Specification"
version: 1.0
date_created: 2026-04-30
tags: [design, threejs, clock, interaction]
---

# Introduction

3D アナログ時計エンティティ（Clock3D）とそのドラッグ操作コントローラ（ClockController）の仕様。プロシージャルに構築された Three.js オブジェクトで、時刻表示・設定・アニメーションを提供する。

## 1. Purpose & Scope

Clock3D は全ゲームモード共通の中心的 3D オブジェクトである。本仕様は時計の形状、寸法、色、角度計算、ドラッグ操作、スナップ動作を定義する。

## 2. Definitions

| 用語 | 定義 |
|------|------|
| ClockTime | `{ hours: number (1-12), minutes: number (0-59) }` |
| Hand | 時計の針（hour=短針、minute=長針、second=秒針） |
| Snap | ドラッグ後に分を最寄りのステップ値に丸める動作 |
| Raycaster | Three.js のポインター → 3D ヒット判定ツール |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: 時計は円形の文字盤、1〜12の数字、60本の目盛り、3本の針で構成される
- **REQ-002**: `setTime(ClockTime)` で任意の時刻に針を設定できる
- **REQ-003**: `getTime()` で現在の針位置から時刻を取得できる
- **REQ-004**: 長針のドラッグ時に短針が連動する（長針1周 = 短針30°）
- **REQ-005**: ドラッグ終了時に指定ステップ（1/5/30分）でスナップする
- **REQ-006**: 秒針は表示/非表示を切り替え可能で、表示時はリアルタイムで回転する

### Constraints

- **CON-001**: 12時間表示のみ（24時間表示なし）
- **CON-002**: 数字は Canvas テクスチャで描画（TextGeometry 不使用）
- **CON-003**: 外部フォントファイル不使用（Google Fonts CDN のみ）

## 4. Interfaces & Data Contracts

### Clock3D 寸法・色定義

| パラメータ | 値 | 備考 |
|-----------|-----|------|
| CLOCK_RADIUS | 2.5 | 文字盤半径（Three.js 単位） |
| CLOCK_DEPTH | 0.3 | — |
| 文字盤色 | `0xFFF8E7` | off-white |
| リム色 | `0x8B7355` | 茶色 |
| リム幅 | 内径 radius-0.05、外径 radius+0.1 | RingGeometry |

### 針の寸法

| 針 | 長さ | 幅 | 色 | Z位置 |
|----|------|-----|------|-------|
| 短針（hour） | 1.4 | 0.15 | `0xE74C3C`（赤） | 0.04 |
| 長針（minute） | 2.0 | 0.10 | `0x3498DB`（青） | 0.05 |
| 秒針（second） | 2.1 | 0.03 | `0x2C3E50`（暗灰） | 0.06 |
| 中心キャップ | 半径0.12 | — | `0xE74C3C`（赤） | 0.07 |

### 針の形状

ShapeGeometry（三角形）:
- 基部: `(-width/2, -0.15)` → `(width/2, -0.15)`
- 先端: `(0, length)`
- ピボット: 原点

### 目盛り

| 種類 | 数 | 長さ | 幅 | 色 |
|------|-----|------|-----|------|
| 主目盛り（5分毎） | 12 | 0.25 | 0.06 | `0x2C3E50` |
| 副目盛り | 48 | 0.12 | 0.02 | `0xBDC3C7` |

### 数字テクスチャ

- Canvas サイズ: 512×512
- フォント: `bold 42px "Zen Maru Gothic", sans-serif`
- 色: `#2C3E50`
- 配置半径: 185px（キャンバス中心から）

### 角度計算

**長針回転:**
```
angle = -(minutes / 60) × 2π
```
- 0分 = 0°（12時位置）、15分 = -90°、30分 = -180°

**短針回転:**
```
angle = -((hours % 12) / 12 + minutes / 720) × 2π
```
- 分による微調整: 1分あたり短針 0.5° 進行

**ポインター角度 → 分変換:**
```
normalized = -angle + π/2
wrap to [0, 2π)
minutes = round((normalized / 2π) × 60) % 60
```

### 時間巻き戻し/進み検出

長針ドラッグ時の `setMinuteAngle()`:
- 前回 > 45分 かつ 現在 < 15分 → 時間 +1
- 前回 < 15分 かつ 現在 > 45分 → 時間 -1
- 時間は 1〜12 の範囲でラップ

### ClockController

| パラメータ | 値 |
|-----------|-----|
| ヒットテスト対象 | clockFace メッシュ（Raycaster） |
| 角度計算 | Z=0 平面との交点 → atan2 |
| ポインターイベント | pointerdown/pointermove/pointerup/pointercancel |
| PointerCapture | ドラッグ開始時に `setPointerCapture` |

### Clock3D Public API

| メソッド | シグネチャ | 動作 |
|---------|-----------|------|
| `setTime` | `(time: ClockTime): void` | 両針の角度を設定 |
| `getTime` | `(): ClockTime` | 現在の時刻を返す（コピー） |
| `setShowSeconds` | `(show: boolean): void` | 秒針の表示切替 |
| `update` | `(dt: number): void` | 秒針アニメーション: `angle -= dt × (2π/60)` |
| `angleToMinutes` | `(angle: number): number` | ポインター角度 → 0〜59 分 |
| `setMinuteAngle` | `(angle: number): void` | 長針を設定、時間連動 |
| `snapMinutes` | `(step: number): void` | 分をステップ値に丸める |
| `getClockFaceMesh` | `(): Object3D \| undefined` | Raycaster 用の面メッシュ |

## 5. Acceptance Criteria

- **AC-001**: Given 3:30 を setTime で設定, When getTime を呼ぶ, Then `{hours: 3, minutes: 30}` が返る
- **AC-002**: Given 長針を12時から3時方向にドラッグ, When ドラッグ完了, Then minutes が 15 になる
- **AC-003**: Given snap step = 5, When minutes が 13, Then snapMinutes 後に 15 になる
- **AC-004**: Given 11:55 で長針を12時を越えて進める, When 分が55→5に変化, Then 時間が11→12になる
- **AC-005**: Given angleToMinutes(π/2), When 呼び出し, Then 0 が返る（12時位置）

## 6. Test Automation Strategy

- **テスト**: `tests/game/entities/Clock3D.test.ts`
- **必須 Mock**: `HTMLCanvasElement.prototype.getContext` → 2D context mock
- **テスト項目**: setTime/getTime 精度、snapMinutes、angleToMinutes の4方位

## 7. Rationale & Context

- 三角形の ShapeGeometry は針の太さと方向を自然に表現する
- Canvas テクスチャによる数字描画は TextGeometry より軽量で、フォントの動的ロード不要
- 秒針は時計らしさの演出目的のみ（ゲーム操作には使わない）

## 8. Dependencies & External Integrations

### Technology Platform Dependencies

- **PLT-001**: Three.js — CircleGeometry, RingGeometry, ShapeGeometry, PlaneGeometry, CanvasTexture, MeshStandardMaterial, MeshBasicMaterial

## 9. Examples & Edge Cases

```typescript
// 基本的な時刻設定
clock.setTime({ hours: 3, minutes: 30 });
console.log(clock.getTime()); // { hours: 3, minutes: 30 }

// スナップ
clock.setTime({ hours: 5, minutes: 13 });
clock.snapMinutes(5);
console.log(clock.getTime()); // { hours: 5, minutes: 15 }

// 12時間ラップ
clock.setTime({ hours: 12, minutes: 55 });
clock.setMinuteAngle(/* 5分の角度 */);
console.log(clock.getTime().hours); // 1 (12→1にラップ)
```

**Edge Cases:**
- 12:00 → 12:01 のドラッグ: 時間が 12 のまま
- 12:55 → 1:05 のドラッグ: 時間が 12→1 にインクリメント
- 1:05 → 12:55 のドラッグ: 時間が 1→12 にデクリメント
- jsdom 環境: Canvas 2D コンテキストが null → テスト時に mock 必須

## 10. Validation Criteria

- `npm run test` の Clock3D テスト（8テスト）が全通過
- ブラウザで時計が正円（楕円でない）で表示される
- タッチドラッグで針がスムーズに追従する
- スナップが正しく動作する（目視 + ユニットテスト）

## 11. Related Specifications

- [spec-architecture-game-core.md](spec-architecture-game-core.md) — ゲームアーキテクチャ
- [spec-design-quiz-system.md](spec-design-quiz-system.md) — クイズシステム（Clock3D を使用）
