---
title: "Procedural Audio Specification"
version: 1.0
date_created: 2026-04-30
tags: [design, audio, web-audio-api, procedural]
---

# Introduction

Web Audio API によるプロシージャルオーディオシステムの仕様。BGM（3モード）と SFX（8種）を音声ファイルなしでリアルタイム生成する。

## 1. Purpose & Scope

本仕様は AudioManager、BGMGenerator、SFXGenerator の全パラメータ — 周波数、ゲイン、波形、スケジューリング — を定義する。

## 2. Definitions

| 用語 | 定義 |
|------|------|
| BGM | Background Music — ループ再生される和音ベースの音楽 |
| SFX | Sound Effect — 短い単発の効果音 |
| OscillatorNode | Web Audio API の発振器ノード（波形生成） |
| GainNode | Web Audio API の音量制御ノード |
| BGMMode | `'title' \| 'play' \| 'result'` |
| SFXType | `'correct' \| 'incorrect' \| 'hint' \| 'levelClear' \| 'allClear' \| 'buttonTap' \| 'tick' \| 'clockSet'` |

## 3. Requirements, Constraints & Guidelines

### Requirements

- **REQ-001**: 全オーディオは Web Audio API で生成する（音声ファイル不使用）
- **REQ-002**: BGM は3モード（title/play/result）を提供する
- **REQ-003**: SFX は8種類を提供する
- **REQ-004**: AudioContext はユーザー操作（ボタンクリック）時に初期化する
- **REQ-005**: タブ非表示時に BGM を停止し、再表示時に再開する
- **REQ-006**: BGM と SFX は独立したゲインノードで音量を個別制御する

### Constraints

- **CON-001**: AudioContext はユーザージェスチャー後にのみ生成可能（ブラウザ制約）
- **CON-002**: iOS Safari では `AudioContext.resume()` が必要な場合がある

## 4. Interfaces & Data Contracts

### AudioManager

| プロパティ | 値 |
|-----------|-----|
| BGM ゲイン | 0.3 |
| SFX ゲイン | 0.5 |
| 接続先 | `context.destination` |

| メソッド | 動作 |
|---------|------|
| `init()` | AudioContext、GainNode×2、BGMGenerator を生成 |
| `startBGM(mode)` | BGM 再生開始 |
| `stopBGM()` | BGM 停止 |
| `resumeBGM()` | BGM 再開 |
| `ensureResumed()` | AudioContext が suspended なら resume |
| `isInitialized()` | 初期化済みか |

### BGM 和音定義

**Title モード（明るいメジャー、各0.8秒）:**

| コード | 周波数 (Hz) |
|--------|------------|
| C | 261.6, 329.6, 392.0 |
| F | 349.2, 440.0, 523.3 |
| G | 392.0, 493.9, 587.3 |
| C | 261.6, 329.6, 392.0 |

**Play モード（落ち着いたマイナー、各1.0秒）:**

| コード | 周波数 (Hz) |
|--------|------------|
| Am | 220.0, 261.6, 329.6 |
| F | 174.6, 220.0, 261.6 |
| C | 261.6, 329.6, 392.0 |
| G | 196.0, 246.9, 293.7 |

**Result モード（ファンファーレ、0.6〜1.2秒）:**

| コード | 周波数 (Hz) | Duration |
|--------|------------|----------|
| C | 261.6, 329.6, 392.0 | 0.6s |
| E | 329.6, 415.3, 493.9 | 0.6s |
| F | 349.2, 440.0, 523.3 | 0.6s |
| G | 392.0, 493.9, 587.3 | 1.2s |

### BGM メロディ定義（triangle 波形）

| モード | 音符（Hz） |
|--------|-----------|
| title | 523.3, 587.3, 659.3, 784.0, 659.3, 523.3, 587.3, 523.3 |
| play | 440.0, 392.0, 349.2, 329.6, 349.2, 392.0, 440.0, 392.0 |
| result | 523.3, 659.3, 784.0, 1047, 784.0, 659.3, 784.0, 1047 |

### BGM 音量・エンベロープ

| パラメータ | コード音 | メロディ音 |
|-----------|---------|-----------|
| 波形 | sine | triangle |
| 音量 | 0.06 | 0.15 |
| 減衰 | exponentialRamp → 0.001 | exponentialRamp → 0.001 |
| メロディ数/コード | 2音（コード長の50%間隔） | — |

### BGM スケジューリング

- 4コード × duration = 1ループ
- setTimeout ベースのスケジューリング
- ループ終了時に再帰的に次のループをスケジュール
- `stop()` で全タイマーをクリア

### SFX 定義

| Type | 周波数 (Hz) | 方式 | 波形 | Duration | Volume |
|------|------------|------|------|----------|--------|
| correct | 523.3, 659.3, 784.0 | fanfare | triangle | 0.12s/note | 0.15 |
| incorrect | 293.7, 220.0 | tone | square | 0.15s | 0.1 |
| hint | 440.0, 523.3 | tone | triangle | 0.15s | 0.08 |
| levelClear | 523.3, 659.3, 784.0, 1047 | fanfare | triangle | 0.2s/note | 0.15 |
| allClear | 392.0, 493.9, 587.3, 659.3, 784.0, 1047 | fanfare | triangle | 0.18s/note | 0.15 |
| buttonTap | 880 | note | sine | 0.08s | 0.1 |
| tick | 1200 | note | sine | 0.03s | 0.05 |
| clockSet | 523.3, 659.3, 784.0 | chord | sine | 0.3s | 0.12 |

### SFX 再生方式

| 方式 | 動作 |
|------|------|
| fanfare | 各音を `i × duration × 800ms` 間隔で順次再生 |
| tone | 各周波数を `i × duration × 500ms` 間隔で順次再生 |
| chord | 全周波数を同時再生 |
| note | 単一周波数を即時再生 |

全方式共通: `gain.exponentialRampToValueAtTime(0.001, currentTime + duration)` で自然減衰

## 5. Acceptance Criteria

- **AC-001**: Given AudioManager 未初期化, When startBGM, Then 何も起きない（エラーなし）
- **AC-002**: Given ユーザーがボタンをクリック, When init(), Then AudioContext が生成される
- **AC-003**: Given BGM(title) 再生中, When stopBGM(), Then 音が停止しタイマーがクリアされる
- **AC-004**: Given correct SFX, When play('correct'), Then 3音の上昇アルペジオが鳴る
- **AC-005**: Given タブ非表示, When visibilitychange, Then BGM が停止する

## 6. Test Automation Strategy

- AudioManager/BGMGenerator/SFXGenerator は Web Audio API に依存するため、ユニットテストでは AudioContext を mock する必要がある
- 現時点ではオーディオ系のテストは手動検証を主とする
- 将来的には AudioContext mock による再生呼び出し検証を追加

## 7. Rationale & Context

- プロシージャル生成によりバンドルサイズを最小化（音声ファイル 0KB）
- 和音ベースの BGM は子供向けのシンプルで心地よい音楽を提供
- SFX のアルペジオは正解の達成感、下降トーンは不正解のフィードバックを直感的に伝える
- setTimeout ベースのスケジューリングは AudioContext の時計と厳密に同期しないが、BGM 用途では十分

## 8. Dependencies & External Integrations

### Technology Platform Dependencies

- **PLT-001**: Web Audio API — OscillatorNode, GainNode, AudioContext

## 9. Examples & Edge Cases

```typescript
// BGM 開始（ユーザー操作後）
audioManager.init();
sfx.init(audioManager.getContext()!, audioManager.getSFXGain()!);
audioManager.startBGM('title');

// SFX 再生
sfx.play('correct');  // 上昇アルペジオ
sfx.play('tick');     // 短いクリック音
```

**Edge Cases:**
- iOS Safari で AudioContext が suspended → `ensureResumed()` で対応
- 高速連打でSFX を大量に同時再生 → 各 Oscillator は自動停止するためリーク無し
- BGM モード切替時に前の BGM が残る → `start()` 内で先に `stop()` を呼ぶ

## 10. Validation Criteria

- ブラウザで各 BGM モードが正しく再生・ループする
- 8種の SFX が正しい音程・タイミングで再生される
- タブ切替時に BGM が正しく停止/再開する

## 11. Related Specifications

- [spec-architecture-game-core.md](spec-architecture-game-core.md) — AudioManager の初期化タイミング
- [spec-design-quiz-system.md](spec-design-quiz-system.md) — SFX トリガー条件
