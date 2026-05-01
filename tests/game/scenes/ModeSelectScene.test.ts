import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ModeSelectScene } from '@/game/scenes/ModeSelectScene';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { SaveManager } from '@/game/storage/SaveManager';
import { LEVELS } from '@/game/config/LevelConfig';

// Mock Canvas 2D context
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  drawImage: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  fillText: vi.fn(),
  canvas: { width: 300, height: 150 },
}) as unknown as typeof HTMLCanvasElement.prototype.getContext;

function setupDOM(): void {
  const uiOverlay = document.createElement('div');
  uiOverlay.id = 'ui-overlay';
  document.body.appendChild(uiOverlay);
}

function cleanupDOM(): void {
  document.getElementById('ui-overlay')?.remove();
}

describe('ModeSelectScene', () => {
  let sceneManager: SceneManager;
  let audioManager: AudioManager;
  let sfx: SFXGenerator;
  let saveManager: SaveManager;
  let scene: ModeSelectScene;

  beforeEach(() => {
    setupDOM();
    localStorage.clear();

    sceneManager = new SceneManager();
    sceneManager.requestTransition = vi.fn();

    audioManager = {
      startBGM: vi.fn(),
      stopBGM: vi.fn(),
    } as unknown as AudioManager;

    sfx = {
      play: vi.fn(),
    } as unknown as SFXGenerator;

    saveManager = new SaveManager();
    scene = new ModeSelectScene(sceneManager, audioManager, sfx, saveManager);
  });

  afterEach(() => {
    scene.exit();
    cleanupDOM();
    localStorage.clear();
  });

  describe('進捗バッジ表示', () => {
    it('未プレイ時は quiz カードに「★ 0/' + LEVELS.length + '」と表示される', () => {
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const badgeTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && text.includes('★'));

      // quiz と setTime の2つのカードに★バッジがある
      expect(badgeTexts.some(t => t === `★ 0/${LEVELS.length}`)).toBe(true);
    });

    it('quiz モードでレベル1,2をクリア済みの場合「★ 2/' + LEVELS.length + '」と表示される', () => {
      const data = saveManager.load();
      data.completedLevels.quiz = [1, 2];
      saveManager.save(data);

      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const badgeTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && text.includes('★'));

      expect(badgeTexts.some(t => t === `★ 2/${LEVELS.length}`)).toBe(true);
    });

    it('setTime モードでレベル1をクリア済みの場合「★ 1/' + LEVELS.length + '」と表示される', () => {
      const data = saveManager.load();
      data.completedLevels.setTime = [1];
      saveManager.save(data);

      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const badgeTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && text.includes('★'));

      expect(badgeTexts.some(t => t === `★ 1/${LEVELS.length}`)).toBe(true);
    });

    it('daily モードが未クリアの場合チェックマークが表示されない', () => {
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const allTexts = uiOverlay.textContent || '';
      expect(allTexts).not.toContain('✅');
    });

    it('daily モードがクリア済み（completedLevels.daily.length > 0）の場合「✅」が表示される', () => {
      const data = saveManager.load();
      data.completedLevels.daily = [1];
      saveManager.save(data);

      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const allTexts = uiOverlay.textContent || '';
      expect(allTexts).toContain('✅');
    });

    it('全レベルクリア済みの場合、分母は LEVELS.length と一致する', () => {
      const data = saveManager.load();
      data.completedLevels.quiz = LEVELS.map(l => l.level);
      saveManager.save(data);

      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const badgeTexts = Array.from(uiOverlay.querySelectorAll('div'))
        .map(el => el.textContent)
        .filter(text => text && text.includes('★'));

      expect(badgeTexts.some(t => t === `★ ${LEVELS.length}/${LEVELS.length}`)).toBe(true);
    });
  });

  describe('カード操作', () => {
    it('quiz カードをクリックすると levelSelect に遷移する', () => {
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const cards = uiOverlay.querySelectorAll('div[data-mode]');
      const quizCard = Array.from(cards).find(c => c.getAttribute('data-mode') === 'quiz');
      quizCard?.dispatchEvent(new Event('click'));

      expect(sceneManager.requestTransition).toHaveBeenCalledWith('levelSelect', { mode: 'quiz' });
    });

    it('daily カードをクリックすると dailyPlay に遷移する', () => {
      scene.enter({});

      const uiOverlay = document.getElementById('ui-overlay')!;
      const cards = uiOverlay.querySelectorAll('div[data-mode]');
      const dailyCard = Array.from(cards).find(c => c.getAttribute('data-mode') === 'daily');
      dailyCard?.dispatchEvent(new Event('click'));

      expect(sceneManager.requestTransition).toHaveBeenCalledWith('dailyPlay', { mode: 'daily' });
    });
  });
});
