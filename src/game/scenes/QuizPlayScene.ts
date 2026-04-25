import * as THREE from 'three';
import type { Scene, SceneContext, ClockTime, QuizResult } from '@/types';
import { SceneManager } from '@/game/SceneManager';
import { AudioManager } from '@/game/audio/AudioManager';
import { SFXGenerator } from '@/game/audio/SFXGenerator';
import { Clock3D } from '@/game/entities/Clock3D';
import { QuizGenerator, formatTime } from '@/game/systems/QuizGenerator';
import { getLevelDef } from '@/game/config/LevelConfig';
import { CorrectEffect } from '@/game/effects/CorrectEffect';
import { IncorrectEffect } from '@/game/effects/IncorrectEffect';
import { HUD } from '@/ui/HUD';
import { ChoiceButtons } from '@/ui/ChoiceButtons';
import { HomeButton } from '@/ui/HomeButton';

export class QuizPlayScene implements Scene {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  private clock3D = new Clock3D();
  private quizGen = new QuizGenerator();
  private correctEffect = new CorrectEffect();
  private incorrectEffect = new IncorrectEffect();
  private hud = new HUD();
  private choiceButtons = new ChoiceButtons();
  private homeButton = new HomeButton();
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
      const time = this.quizGen.generateTime(this.level);
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

    // Add clock
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
    this.clock3D.update(dt);
    this.correctEffect.update(dt);
    this.incorrectEffect.update(dt);
  }

  exit(): void {
    this.scene.remove(this.clock3D.group);
    this.audioManager.stopBGM();
    this.hud.unmount();
    this.choiceButtons.unmount();
    this.homeButton.unmount();
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

    const bottomArea = document.createElement('div');
    bottomArea.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-bottom: 16px;
    `;
    this.choiceButtons.mount(bottomArea);
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

    // Choice callback
    this.choiceButtons.onSelect((selectedIndex) => {
      this.handleAnswer(selectedIndex);
    });
  }

  private showQuestion(): void {
    const q = this.questions[this.currentQuestion];
    const def = getLevelDef(this.level);

    this.clock3D.setTime(q);
    this.hud.updateQuestion(this.currentQuestion + 1, def.questionCount);
    this.hud.updateScore(this.correctCount);
    this.choiceButtons.setChoices(this.choices[this.currentQuestion]);
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
      this.showNotification(
        `こたえは ${formatTime(q)} だよ！`,
        '#E74C3C',
      );
    } else {
      this.showNotification('⭕ せいかい！', '#2ECC71');
    }

    setTimeout(() => {
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
    }, 1500);
  }

  private showNotification(text: string, color: string): void {
    const notif = document.createElement('div');
    notif.textContent = text;
    notif.style.cssText = `
      position: absolute;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Zen Maru Gothic', sans-serif;
      font-size: clamp(24px, 5vw, 40px);
      font-weight: 900;
      color: ${color};
      background: rgba(255,255,255,0.95);
      padding: 16px 32px;
      border-radius: 20px;
      border: 3px solid ${color};
      pointer-events: none;
      animation: notifPop 0.3s ease-out;
      z-index: 50;
    `;

    if (!document.getElementById('notif-anim')) {
      const style = document.createElement('style');
      style.id = 'notif-anim';
      style.textContent = `
        @keyframes notifPop {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    this.overlay?.appendChild(notif);
    setTimeout(() => notif.remove(), 1200);
  }
}
