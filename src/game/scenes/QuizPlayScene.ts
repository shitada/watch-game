import * as THREE from 'three';
import type { Scene, SceneContext, ClockTime, QuizResult } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';
import { QuizGenerator, formatTime } from '@/game/systems/QuizGenerator';
import { getLevelDef } from '@/game/config/LevelConfig';
import { GameSettings } from '@/game/config/GameSettings';
import { CorrectEffect } from '@/game/effects/CorrectEffect';
import { IncorrectEffect } from '@/game/effects/IncorrectEffect';
import { HintEffect } from '@/game/effects/HintEffect';
import { HUD } from '@/ui/HUD';
import { ChoiceButtons } from '@/ui/ChoiceButtons';
import { HomeButton } from '@/ui/HomeButton';
import { HintButton } from '@/ui/HintButton';
import { showNotification } from '@/ui/Notification';

export class QuizPlayScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private clock3D: Clock3D | null = null;
  private quizGen = new QuizGenerator();
  private correctEffect = new CorrectEffect();
  private incorrectEffect = new IncorrectEffect();
  private hintEffect = new HintEffect();
  private hud = new HUD();
  private choiceButtons = new ChoiceButtons();
  private homeButton = new HomeButton();
  private hintButton: HintButton | null = null;
  private overlay: HTMLDivElement | null = null;

  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;

  private level = 1;
  private questions: ClockTime[] = [];
  private choices: ClockTime[][] = [];
  private correctIndex: number[] = [];
  private currentQuestion = 0;
  private correctCount = 0;
  private results: QuizResult[] = [];
  private waitingNext = false;
  private pendingTimers: ReturnType<typeof setTimeout>[] = [];
  private hintShown = false;

  constructor(
    sceneManager: SceneManager,
    audioManager: AudioManager,
    sfx: SFXGenerator,
  ) {
    this.sceneManager = sceneManager;
    this.audioManager = audioManager;
    this.sfx = sfx;

    this.camera.position.set(0, 0, 8);
    this.camera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 5, 10);
    this.scene.add(ambient, directional);
    this.scene.background = new THREE.Color(0xE8F8F5);
  }

  enter(context: SceneContext): void {
    this.level = context.level ?? 1;
    const def = getLevelDef(this.level);

    // Generate questions
    this.questions = [];
    this.choices = [];
    this.correctIndex = [];
    for (let i = 0; i < def.questionCount; i++) {
      const time = this.quizGen.generateUniqueTime(this.level, this.questions);
      const choiceSet = this.quizGen.generateChoices(time, this.level);
      const idx = choiceSet.findIndex(
        c => c.hours === time.hours && c.minutes === time.minutes,
      );
      this.questions.push(time);
      this.choices.push(choiceSet);
      this.correctIndex.push(idx);
    }

    this.currentQuestion = 0;
    this.correctCount = 0;
    this.results = [];
    this.waitingNext = false;
    this.pendingTimers = [];

    // Add clock
    this.clock3D = new Clock3D();
    this.scene.add(this.clock3D.group);
    this.clock3D.group.position.set(0, 0.8, 0);
    this.clock3D.setShowSeconds(false);

    // Build UI
    this.buildOverlay();

    // Audio
    this.audioManager.startBGM('play');

    // Show first question
    this.showQuestion();
  }

  update(dt: number): void {
    this.clock3D?.update(dt);
    this.correctEffect.update(dt);
    this.incorrectEffect.update(dt);
    this.hintEffect.update(dt);
  }

  exit(): void {
    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers = [];
    if (this.clock3D) {
      this.scene.remove(this.clock3D.group);
      this.clock3D.dispose();
      this.clock3D = null;
    }
    this.correctEffect.dispose();
    this.incorrectEffect.dispose();
    this.hintEffect.dispose();
    this.audioManager.stopBGM();
    this.hud.unmount();
    this.choiceButtons.unmount();
    this.homeButton.unmount();
    this.hintButton?.unmount();
    this.overlay?.remove();
    this.overlay = null;
  }

  getThreeScene(): THREE.Scene { return this.scene; }
  getCamera(): THREE.Camera { return this.camera; }

  private buildOverlay(): void {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      pointer-events: none;
    `;

    const topBar = document.createElement('div');
    topBar.style.cssText = 'pointer-events: none;';
    this.hud.mount(topBar);
    overlay.appendChild(topBar);

    const prompt = document.createElement('div');
    prompt.textContent = 'この とけいは なんじかな？🤔';
    prompt.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(20px, 4vw, 32px);
      font-weight: 700;
      color: #2C3E50;
      background: rgba(255,255,255,0.9);
      padding: 10px 24px;
      border-radius: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
      align-self: center;
    `;
    overlay.appendChild(prompt);

    const bottomArea = document.createElement('div');
    bottomArea.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 16px;
    `;
    this.choiceButtons.mount(bottomArea);
    overlay.appendChild(bottomArea);

    // Hint button container (bottom-right)
    const hintContainer = document.createElement('div');
    hintContainer.style.cssText = `position: absolute; right: 20px; bottom: 20px; pointer-events: auto;`;
    overlay.appendChild(hintContainer);

    const uiOverlay = document.getElementById('ui-overlay')!;
    uiOverlay.appendChild(overlay);
    this.overlay = overlay;

    // Home button
    const hud = document.getElementById('hud')!;
    this.homeButton.mount(hud);
    this.homeButton.onClick(() => {
      this.sfx.play('buttonTap');
      this.sceneManager.requestTransition('modeSelect');
    });

    // Hint button
    this.hintButton = new HintButton();
    this.hintButton.mount(hintContainer);
    this.hintButton.onClick(() => {
      this.sfx.play('buttonTap');
      if (!this.quizGen.canUseHint()) return;
      this.quizGen.useHint();
      this.triggerManualHint();
      this.hintButton?.setRemaining(this.quizGen.remainingHints());
    });

    // Choice callback
    this.choiceButtons.onSelect((selectedIndex) => {
      this.handleAnswer(selectedIndex);
    });
  }

  private showQuestion(): void {
    // Clear previous timers (W-2: hint timer + any lingering notification timers)
    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers = [];
    this.hintShown = false;

    const q = this.questions[this.currentQuestion];
    const def = getLevelDef(this.level);

    this.clock3D?.setTime(q);
    this.hud.updateQuestion(this.currentQuestion + 1, def.questionCount);
    this.hud.updateScore(this.correctCount);
    this.choiceButtons.setChoices(this.choices[this.currentQuestion]);

    // Reset per-question hint state in generator
    this.quizGen.startQuestion();

    // Set hint timer (W-1: added to pendingTimers for exit cleanup)
    this.pendingTimers.push(setTimeout(() => {
      this.triggerHint();
    }, GameSettings.HINT_DELAY_MS));

    // update hint button remaining
    this.hintButton?.setRemaining(this.quizGen.remainingHints());
  }

  private triggerHint(): void {
    if (this.hintShown || this.waitingNext) return;
    if (!this.quizGen.canUseHint()) return;
    this.hintShown = true;
    this.quizGen.useHint();
    this.sfx.play('hint');
    const q = this.questions[this.currentQuestion];
    // visual hint
    this.hintEffect.trigger(this.scene, q, new THREE.Vector3(0, 0.8, 0));
    this.choiceButtons.showHint(this.correctIndex[this.currentQuestion]);
    this.pendingTimers.push(
      showNotification(this.overlay!, '💡 ヒント！', '#F39C12'),
    );
    this.hintButton?.setRemaining(this.quizGen.remainingHints());
  }

  private handleAnswer(selectedIndex: number): void {
    if (this.waitingNext) return;
    this.waitingNext = true;

    const q = this.questions[this.currentQuestion];
    const isCorrect = selectedIndex === this.correctIndex[this.currentQuestion];

    if (isCorrect) {
      this.correctCount++;
      this.sfx.play('correct');
      this.correctEffect.trigger(this.scene, new THREE.Vector3(0, 0.8, 1));
    } else {
      this.sfx.play('incorrect');
      this.incorrectEffect.trigger(this.scene, new THREE.Vector3(0, 0.8, 1));
    }

    const selected = this.choices[this.currentQuestion][selectedIndex];
    this.results.push({
      questionIndex: this.currentQuestion,
      targetTime: q,
      answerTime: selected,
      correct: isCorrect,
    });

    this.choiceButtons.showResult(
      this.correctIndex[this.currentQuestion],
      selectedIndex,
    );
    this.hud.updateScore(this.correctCount);

    // Show hint for incorrect
    if (!isCorrect) {
      this.pendingTimers.push(
        showNotification(this.overlay!, `こたえは ${formatTime(q)} だよ！`, '#E74C3C'),
      );
    } else {
      this.pendingTimers.push(
        showNotification(this.overlay!, '⭕ せいかい！', '#2ECC71'),
      );
    }

    this.pendingTimers.push(setTimeout(() => {
      this.waitingNext = false;
      this.currentQuestion++;

      const def = getLevelDef(this.level);
      if (this.currentQuestion >= def.questionCount) {
        this.sceneManager.requestTransition('result', {
          mode: 'quiz',
          level: this.level,
          results: this.results,
        });
      } else {
        this.showQuestion();
      }
    }, 1500));
  }

  private triggerManualHint(): void {
    if (this.hintShown || this.waitingNext) return;
    this.hintShown = true;
    const q = this.questions[this.currentQuestion];
    this.sfx.play('hint');
    this.hintEffect.trigger(this.scene, q, new THREE.Vector3(0, 0.8, 0));
    this.choiceButtons.showHint(this.correctIndex[this.currentQuestion]);
    this.pendingTimers.push(
      showNotification(this.overlay!, '💡 ヒント！', '#F39C12'),
    );
    this.hintButton?.setRemaining(this.quizGen.remainingHints());
  }
}
