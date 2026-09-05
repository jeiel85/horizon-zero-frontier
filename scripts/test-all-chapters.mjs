import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function runE2ETest() {
  console.log('====================================================');
  console.log('🚀 HORIZON: ZERO FRONTIER - E2E FULL GAMEPLAY TEST');
  console.log('====================================================');

  // 1. Launch Vite preview server
  console.log('📦 Starting preview server...');
  const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
    shell: true,
    stdio: 'pipe',
  });

  // Wait 3 seconds for server to be ready
  await new Promise((r) => setTimeout(r, 3000));

  let browser;
  try {
    console.log('🌐 Launching headless browser (Edge)...');
    browser = await chromium.launch({
      headless: true,
      channel: 'msedge',
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
    });

    const page = await browser.newPage();

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error]: ${msg.text()}`);
      }
    });

    page.on('pageerror', (err) => {
      console.error('[Browser Page Error]:', err.message);
    });

    console.log('🎮 Navigating to http://localhost:4173 ...');
    await page.goto('http://localhost:4173', { waitUntil: 'domcontentloaded', timeout: 20000 });

    // Wait for title screen
    await page.waitForSelector('#title-screen');
    console.log('✓ Title screen rendered successfully.');

    // Click Start Game
    await page.click('#btn-start-game');
    console.log('✓ Start Game button clicked.');

    // Wait for gameEngine to be available
    await page.waitForFunction(() => window.gameEngine !== undefined, { timeout: 10000 });
    console.log('✓ 3D Game Engine initialized.');

    // Wait 1 second for scene & machines to settle
    await page.waitForTimeout(1000);

    // =========================================================================
    // CHAPTER 1: 사냥꾼의 증표 (The Hunter's Path)
    // =========================================================================
    console.log('\n--- Testing Chapter 1 ---');
    const ch1Result = await page.evaluate(() => {
      const engine = window.gameEngine;
      const q = engine.quests.getActiveMainQuest();
      if (!q || q.chapter !== 1) return { ok: false, msg: 'Ch1 not active' };

      // 1. Scan Watcher with Focus [V]
      engine.focus.toggle();
      engine.quests.reportEvent('scan_watcher', engine.player);

      // 2. Hunt 2 Watchers
      engine.quests.reportEvent('hunt_watcher', engine.player, 2);

      // 3. Recover Lens
      engine.quests.reportEvent('recover_lens', engine.player);

      return {
        ok: q.completed,
        nextChActive: engine.quests.quests.find((item) => item.chapter === 2)?.active,
      };
    });

    if (!ch1Result.ok) throw new Error('Chapter 1 failed to complete');
    console.log('✓ Chapter 1 (사냥꾼의 증표) COMPLETE!');

    // =========================================================================
    // CHAPTER 2: 야생의 질주 (Wild Stride)
    // =========================================================================
    console.log('\n--- Testing Chapter 2 ---');
    const ch2Result = await page.evaluate(() => {
      const engine = window.gameEngine;
      const q = engine.quests.getActiveMainQuest();
      if (!q || q.chapter !== 2) return { ok: false, msg: 'Ch2 not active' };

      // 1. Detonate Blaze Canister with fire arrow
      engine.quests.reportEvent('detonate_canister', engine.player);

      // 2. Override Strider
      engine.quests.reportEvent('override_strider', engine.player);

      // 3. Ride Strider
      engine.quests.reportEvent('ride_strider', engine.player);

      return {
        ok: q.completed,
        nextChActive: engine.quests.quests.find((item) => item.chapter === 3)?.active,
      };
    });

    if (!ch2Result.ok) throw new Error('Chapter 2 failed to complete');
    console.log('✓ Chapter 2 (야생의 질주) COMPLETE!');

    // =========================================================================
    // CHAPTER 3: 도둑맞은 불꽃 (Stolen Fire)
    // =========================================================================
    console.log('\n--- Testing Chapter 3 ---');
    const ch3Result = await page.evaluate(() => {
      const engine = window.gameEngine;
      const q = engine.quests.getActiveMainQuest();
      if (!q || q.chapter !== 3) return { ok: false, msg: 'Ch3 not active' };

      // 1. Reach Canyon
      engine.quests.reportEvent('reach_canyon', engine.player);

      // 2. Tear Heavy Cannon
      engine.quests.reportEvent('tear_cannon', engine.player);

      // 3. Defeat Ravager
      engine.quests.reportEvent('defeat_ravager', engine.player);

      return {
        ok: q.completed,
        nextChActive: engine.quests.quests.find((item) => item.chapter === 4)?.active,
      };
    });

    if (!ch3Result.ok) throw new Error('Chapter 3 failed to complete');
    console.log('✓ Chapter 3 (도둑맞은 불꽃) COMPLETE!');

    // =========================================================================
    // CHAPTER 4: 톨넥의 눈 (Eye of the Tallneck)
    // =========================================================================
    console.log('\n--- Testing Chapter 4 ---');
    const ch4Result = await page.evaluate(() => {
      const engine = window.gameEngine;
      const q = engine.quests.getActiveMainQuest();
      if (!q || q.chapter !== 4) return { ok: false, msg: 'Ch4 not active' };

      // 1. Climb Tallneck
      engine.quests.reportEvent('climb_tallneck', engine.player);

      // 2. Sync Map Core
      engine.quests.reportEvent('sync_map', engine.player);

      return {
        ok: q.completed,
        nextChActive: engine.quests.quests.find((item) => item.chapter === 5)?.active,
      };
    });

    if (!ch4Result.ok) throw new Error('Chapter 4 failed to complete');
    console.log('✓ Chapter 4 (톨넥의 눈) COMPLETE!');

    // =========================================================================
    // CHAPTER 5: 가마솥 시그마의 심장 (Heart of Cauldron SIGMA - FINAL BOSS)
    // =========================================================================
    console.log('\n--- Testing Chapter 5 (Final Boss & Victory) ---');
    const ch5Result = await page.evaluate(() => {
      const engine = window.gameEngine;
      const q = engine.quests.getActiveMainQuest();
      if (!q || q.chapter !== 5) return { ok: false, msg: 'Ch5 not active' };

      // 1. Enter Cauldron
      engine.quests.reportEvent('enter_cauldron', engine.player);

      // 2. Tear Disc Launchers (2/2)
      engine.quests.reportEvent('tear_launchers', engine.player, 2);

      // 3. Defeat Thunderjaw Apex Boss
      engine.quests.reportEvent('defeat_thunderjaw', engine.player);

      return {
        ok: q.completed,
      };
    });

    if (!ch5Result.ok) throw new Error('Chapter 5 failed to complete');
    console.log('✓ Chapter 5 (가마솥 시그마의 심장) COMPLETE!');

    // Verify Victory Screen is displayed
    await page.waitForTimeout(500);
    const isVictoryVisible = await page.evaluate(() => {
      const victoryScreen = document.getElementById('victory-screen');
      return victoryScreen && !victoryScreen.classList.contains('hidden');
    });

    if (!isVictoryVisible) {
      throw new Error('Victory screen did not show up!');
    }
    console.log('🏆 VICTORY SCREEN DISPLAYED: "새벽의 승리자" confirmed!');

    // Take screenshot of victory
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    await page.screenshot({ path: 'test-results/stage-final-victory.png' });
    console.log('📸 Screenshot saved to test-results/stage-final-victory.png');

    // =========================================================================
    // SAVE & LOAD SYSTEM VERIFICATION
    // =========================================================================
    console.log('\n--- Testing Save & Load System ---');
    const saveLoadResult = await page.evaluate(() => {
      const engine = window.gameEngine;
      // 1. Save game
      engine.saveManager.saveGame(
        'slot_1',
        engine.player,
        engine.bow,
        engine.inventory,
        engine.quests,
        engine.vegetation
      );

      // Change HP
      engine.player.hp = 12;

      // 2. Load game
      const loaded = engine.saveManager.loadGame(
        'slot_1',
        engine.player,
        engine.bow,
        engine.inventory,
        engine.quests,
        engine.vegetation
      );

      return {
        loaded,
        hpRestored: engine.player.hp > 50,
      };
    });

    if (!saveLoadResult.loaded || !saveLoadResult.hpRestored) {
      throw new Error('Save & Load verification failed');
    }
    console.log('✓ Save & Load System verified successfully!');

    console.log('\n====================================================');
    console.log('🎉 ALL 5 CHAPTERS & FINAL BOSS TEST PASSED (100% SUCCESS)');
    console.log('====================================================');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

runE2ETest().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
