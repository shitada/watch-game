import * as THREE from 'three';
import type { Scene, SceneContext, ClockTime, QuizResult } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';
import { ClockController } from '@/game/systems/ClockController';
import { QuizGenerator, formatTime } from '@/game/systems/QuizGenerator';
import { TimeValidator } from '@/game/systems/TimeValidator';
import { getLevelDef } from '@/game/config/LevelConfig';
import { CorrectEffect } from '@/game/effects/CorrectEffect';
import { IncorrectEffect } from '@/game/effects/IncorrectEffect';
import { HUD } from '@/ui/HUD';
import { TimeDisplay } from '@/ui/TimeDisplay';
import { CurrentTimeDisplay } from '@/ui/CurrentTimeDisplay';
import { HomeButton } from '@/ui/HomeButton';
import { ConfirmButton } from '@/ui/ConfirmButton';
import { showNotification } from '@/ui/Notification';

export class SetTimePlayScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private clock3D: Clock3D | null = null;
  private clockController: ClockController | null = null;
  private quizGen = new QuizGenerator();
  private validator = new TimeValidator();
  private correctEffect = new CorrectEffect();
  private incorrectEffect = new IncorrectEffect();
  private hud = new HUD();
  private timeDisplay = new TimeDisplay();
  private currentTimeDisplay = new CurrentTimeDisplay();
  private homeButton = new HomeButton();
  private confirmButton = new ConfirmButton();
  private overlay: HTMLDivElement | null = null;

  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private renderer: THREE.WebGLRenderer | null = null;

  private level = 1;
  private questions: ClockTime[] = [];
  private currentQuestion = 0;
  private correctCount = 0;
  private results: QuizResult[] = [];
  private waitingNext = false;
  private pendingTimers: ReturnType<typeof setTimeout>[] = [];

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
    this.scene.background = new THREE.Color(0xFDF2E9);
  }

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  enter(context: SceneContext): void {
    this.level = context.level ?? 1;
    const def = getLevelDef(this.level);

    // Generate questions
    this.questions = [];
    for (let i = 0; i < def.questionCount; i++) {
      this.questions.push(this.quizGen.generateUniqueTime(this.level, this.questions));
    }

    this.currentQuestion = 0;
    this.correctCount = 0;
    this.results = [];
    this.waitingNext = false;
    this.pendingTimers = [];

    // Add clock
    this.clock3D = new Clock3D();
    this.scene.add(this.clock3D.group);
    this.clock3D.group.position.set(0, -0.5, 0);
    this.clock3D.setShowSeconds(false);

    // Setup controller
    if (this.renderer) {
      this.clockController = new ClockController(
        this.clock3D,
        this.renderer,
        this.camera,
      );
      this.clockController.setSnapStep(def.minuteStep >= 60 ? 30 : def.minuteStep);
      this.clockController.setEnabled(true);
      this.clockController.onChange(() => {
        this.sfx.play('tick');
        this.currentTimeDisplay.setTime(this.clock3D!.getTime());
      });
    }

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
  }

  exit(): void {
    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers = [];
    // Remove clock from scene first
    if (this.clock3D) {
      this.scene.remove(this.clock3D.group);
    }

    // Dispose controller before disposing clock
    this.clockController?.dispose();
    this.clockController = null;

    if (this.clock3D) {
      this.clock3D.dispose();
      this.clock3D = null;
    }

    this.correctEffect.dispose();
    this.incorrectEffect.dispose();
    this.audioManager.stopBGM();
    this.hud.unmount();
    this.timeDisplay.unmount();
    this.currentTimeDisplay.unmount();
    this.homeButton.unmount();
    this.confirmButton.unmount();
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

    // Top section
    const topSection = document.createElement('div');
    topSection.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    this.hud.mount(topSection);
    this.timeDisplay.mount(topSection);
    this.currentTimeDisplay.mount(topSection);
    overlay.appendChild(topSection);

    // Bottom — confirm button
    const bottomArea = document.createElement('div');
    bottomArea.style.cssText = `
      display: flex;
      justify-content: center;
      padding-bottom: 24px;
    `;

    this.confirmButton.mount(bottomArea);
    this.confirmButton.onClick(() => {
      this.handleConfirm();
    });
    overlay.appendChild(bottomArea);

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
  }

  private showQuestion(): void {
    const q = this.questions[this.currentQuestion];
    const def = getLevelDef(this.level);

    // Reset clock to 12:00
    this.clock3D?.setTime({ hours: 12, minutes: 0 });
    this.clockController?.setEnabled(true);

    this.timeDisplay.setTime(q);
    this.currentTimeDisplay.setTime({ hours: 12, minutes: 0 });
    this.hud.updateQuestion(this.currentQuestion + 1, def.questionCount);
    this.hud.updateScore(this.correctCount);
    this.confirmButton.enable();
  }

  private handleConfirm(): void {
    if (this.waitingNext) return;
    this.waitingNext = true;
    this.confirmButton.disable();

    const target = this.questions[this.currentQuestion];
    const answer = this.clock3D!.getTime();
    const def = getLevelDef(this.level);
    const isCorrect = this.validator.validate(target, answer, def.tolerance);

    this.clockController?.setEnabled(false);
    this.sfx.play('clockSet');

    if (isCorrect) {
      this.correctCount++;
      this.sfx.play('correct');
      this.correctEffect.trigger(this.scene, new THREE.Vector3(0, -0.5, 1));
      this.pendingTimers.push(
        showNotification(this.overlay!, '⭕ せいかい！', '#2ECC71'),
      );
    } else {
      this.sfx.play('incorrect');
      this.incorrectEffect.trigger(this.scene, new THREE.Vector3(0, -0.5, 1));
      // Show correct answer
      this.clock3D?.setTime(target);
      this.currentTimeDisplay.setTime(target);
      this.pendingTimers.push(
        showNotification(this.overlay!, `こたえは ${formatTime(target)} だよ！`, '#E74C3C'),
      );
    }

    this.results.push({
      questionIndex: this.currentQuestion,
      targetTime: target,
      answerTime: answer,
      correct: isCorrect,
    });

    this.hud.updateScore(this.correctCount);

    this.pendingTimers.push(setTimeout(() => {
      this.waitingNext = false;
      this.currentQuestion++;

      if (this.currentQuestion >= def.questionCount) {
        this.sceneManager.requestTransition('result', {
          mode: 'setTime',
          level: this.level,
          results: this.results,
        });
      } else {
        this.showQuestion();
      }
    }, 1500));
  }
}
