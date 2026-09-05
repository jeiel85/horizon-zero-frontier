import { Engine } from './core/Engine';
import { soundManager } from './audio/SoundManager';

window.addEventListener('DOMContentLoaded', () => {
  const engine = new Engine();

  const titleScreen = document.getElementById('title-screen')!;
  const btnStart = document.getElementById('btn-start-game')!;
  const btnLoad = document.getElementById('btn-load-game')!;
  const btnControls = document.getElementById('btn-controls-guide')!;

  // 1. New Game
  btnStart.addEventListener('click', () => {
    soundManager.init();
    titleScreen.classList.add('hidden');
    engine.start();
    engine.ui.showToast('새로운 오픈월드 여정이 시작되었습니다!');
  });

  // 2. Continue / Load Game
  btnLoad.addEventListener('click', () => {
    soundManager.init();
    const ok = engine.saveManager.loadGame(
      'auto_save',
      engine.player,
      engine.bow,
      engine.inventory,
      engine.quests,
      engine.vegetation
    );

    if (ok) {
      titleScreen.classList.add('hidden');
      engine.start();
      engine.ui.showToast('이전 여정 기록을 성공적으로 불러왔습니다.');
    } else {
      alert('저장된 데이터가 없습니다. 새 게임을 시작합니다.');
      titleScreen.classList.add('hidden');
      engine.start();
    }
  });

  // 3. Controls Guide
  btnControls.addEventListener('click', () => {
    soundManager.init();
    engine.ui.togglePauseMenu(true);
    // Switch to controls tab
    const controlsTabBtn = document.querySelector('[data-tab="tab-controls"]') as HTMLElement;
    controlsTabBtn?.click();
  });
});
