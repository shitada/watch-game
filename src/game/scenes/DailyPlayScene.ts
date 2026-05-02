import * as THREE from 'three';
import type { Scene, SceneContext, QuizResult } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';
import { ClockController } from '@/game/systems/ClockController';
import { TimeValidator } from '@/game/systems/TimeValidator';
import { DAILY_EVENTS } from '@/game/config/DailySchedule';
import { GameSettings } from '@/game/config/GameSettings';
import { CorrectEffect } from '@/game/effects/CorrectEffect';
import { IncorrectEffect } from '@/game/effects/IncorrectEffect';
import { DailyProgress } from '@/ui/DailyProgress';
import { CurrentTimeDisplay } from '@/ui/CurrentTimeDisplay';
import { HomeButton } from '@/ui/HomeButton';
import { ConfirmButton } from '@/ui/ConfirmButton';
import { formatTime } from '@/game/systems/QuizGenerator';
import { showNotification } from '@/ui/Notification';

export class DailyPlayScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private clock3D: Clock3D | null = null;
  private clockController: ClockController | null = null;
  private validator = new TimeValidator();
  private correctEffect = new CorrectEffect();
  private incorrectEffect = new IncorrectEffect();
  private dailyProgress = new DailyProgress();
  private currentTimeDisplay = new CurrentTimeDisplay();
  private homeButton = new HomeButton();
  private confirmButton = new ConfirmButton({ colorFrom: '#E67E22', colorTo: '#D35400' });
  private overlay: HTMLDivElement | null = null;
  private eventLabel: HTMLDivElement | null = null;

  private sceneManager: SceneManager;
  private audioManager: AudioManager;
  private sfx: SFXGenerator;
  private renderer: THREE.WebGLRenderer | null = null;

  private currentEventIndex = 0;
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
    this.scene.background = new THREE.Color(0xFEF9E7);
  }

  setRenderer(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;
  }

  enter(_context: SceneContext): void {
    this.currentEventIndex = 0;
    this.correctCount = 0;
    this.results = [];
    this.waitingNext = false;
    this.pendingTimers = [];

    // Add clock
    this.clock3D = new Clock3D();
    this.scene.add(this.clock3D.group);
    this.clock3D.group.position.set(0, -0.2, 0);
    this.clock3D.setShowSeconds(false);

    // Setup controller
    if (this.renderer) {
      this.clockController = new ClockController(
        this.clock3D!,
        this.renderer,
        this.camera,
      );
      this.clockController.setSnapStep(30);
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

    // Show first event
    this.showEvent();
  }

  update(dt: number): void {
    this.clock3D?.update(dt);
    this.correctEffect.update(dt);
    this.incorrectEffect.update(dt);
  }

  exit(): void {
    this.pendingTimers.forEach(id => clearTimeout(id));
    this.pendingTimers = [];
    if (this.clock3D) {
      this.scene.remove(this.clock3D.group);
    }
    this.clockController?.dispose();
    this.clockController = null;

    if (this.clock3D) {
      this.clock3D.dispose();
      this.clock3D = null;
    }

    this.correctEffect.dispose();
    this.incorrectEffect.dispose();
    this.audioManager.stopBGM();
    this.dailyProgress.unmount();
    this.currentTimeDisplay.unmount();
    this.homeButton.unmount();
    this.confirmButton.unmount();
    this.overlay?.remove();
    this.overlay = null;
    this.eventLabel = null;
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
    topSection.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding-top: 12px;
    `;
    this.dailyProgress.mount(topSection);

    // Event label
    this.eventLabel = document.createElement('div');
    this.eventLabel.style.cssText = `
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(24px, 5vw, 40px);
      font-weight: 900;
      color: #2C3E50;
      background: rgba(255,255,255,0.9);
      padding: 12px 28px;
      border-radius: 20px;
      border: 3px solid #E67E22;
      text-align: center;
    `;
    topSection.appendChild(this.eventLabel);

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

  private showEvent(): void {
    const event = DAILY_EVENTS[this.currentEventIndex];

    // Reset clock
    this.clock3D?.setTime({ hours: 12, minutes: 0 });
    this.clockController?.setEnabled(true);

    // Update UI
    this.dailyProgress.setEvents(DAILY_EVENTS, this.currentEventIndex);
    if (this.eventLabel) {
      this.eventLabel.textContent = `${event.emoji} ${event.name}`;
    }
    this.currentTimeDisplay.setTime({ hours: 12, minutes: 0 });
    this.confirmButton.enable();
  }

  private handleConfirm(): void {
    if (this.waitingNext) return;
    this.waitingNext = true;
    this.confirmButton.disable();

    const event = DAILY_EVENTS[this.currentEventIndex];
    const answer = this.clock3D?.getTime() ?? { hours: 12, minutes: 0 };
    const isCorrect = this.validator.validate(
      event.time,
      answer,
      GameSettings.DAILY_TOLERANCE_MINUTES,
    );

    this.clockController?.setEnabled(false);
    this.sfx.play('clockSet');

    if (isCorrect) {
      this.correctCount++;
      this.sfx.play('correct');
      this.correctEffect.trigger(this.scene, new THREE.Vector3(0, -0.2, 1));
      this.pendingTimers.push(
        showNotification(this.overlay!, '⭕ せいかい！', '#2ECC71', {
          top: '35%', fontSize: 'clamp(22px, 4.5vw, 36px)', padding: '14px 28px',
        }),
      );
    } else {
      this.sfx.play('incorrect');
      this.incorrectEffect.trigger(this.scene, new THREE.Vector3(0, -0.2, 1));
      this.clock3D?.setTime(event.time);
      this.currentTimeDisplay.setTime(event.time);
      this.pendingTimers.push(
        showNotification(this.overlay!, `${event.name} は ${formatTime(event.time)} だよ！`, '#E74C3C', {
          top: '35%', fontSize: 'clamp(22px, 4.5vw, 36px)', padding: '14px 28px',
        }),
      );
    }

    this.results.push({
      questionIndex: this.currentEventIndex,
      targetTime: event.time,
      answerTime: answer,
      correct: isCorrect,
    });

    this.pendingTimers.push(setTimeout(() => {
      this.waitingNext = false;
      this.currentEventIndex++;

      if (this.currentEventIndex >= DAILY_EVENTS.length) {
        this.sceneManager.requestTransition('result', {
          mode: 'daily',
          results: this.results,
        });
      } else {
        this.showEvent();
      }
    }, 1500));
  }
}
