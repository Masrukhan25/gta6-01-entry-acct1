import { assertClean, enterMaravela, observePage, openBrowser } from './playwright-support.mjs';

// Headless SwiftShader runs the sim well below real time, so movement checks
// poll game state instead of relying on fixed real-time holds.
async function waitForState(page, fn, timeoutMs, label) {
  const start = Date.now();
  for (;;) {
    const ok = await page.evaluate(fn);
    if (ok) return;
    if (Date.now() - start > timeoutMs) throw new Error(`Timed out waiting for: ${label}`);
    await page.waitForTimeout(400);
  }
}

const browser = await openBrowser();
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const signals = observePage(page);

try {
  await enterMaravela(page);
  const initial = await page.evaluate(() => window.tidebreak.getState());
  if (initial.threeVersion !== '187' || initial.chunks !== 16 || initial.districts.length < 10) {
    throw new Error(`Engine or city setup incomplete: ${JSON.stringify(initial)}`);
  }
  if (await page.locator('#district-label').textContent() !== 'Boardwalk') throw new Error('Boardwalk district is not on the HUD.');

  // Walk forward until clearly moved (and clear of the parked sedan at z=5).
  await page.keyboard.down('W');
  await waitForState(page, () => window.tidebreak.getState().player.z < -3, 30000, 'walk forward');
  await page.keyboard.up('W');
  const walked = await page.evaluate(() => window.tidebreak.getState().player);

  // Jump: hold Space until the arc rises, then wait to land again.
  await page.keyboard.down('Space');
  await waitForState(page, () => window.tidebreak.getState().player.y > 0.3, 10000, 'jump rise');
  const jumped = await page.evaluate(() => window.tidebreak.getState().player);
  await page.keyboard.up('Space');
  await waitForState(page, () => { const p = window.tidebreak.getState().player; return p.grounded && p.y === 0; }, 10000, 'land after jump');

  // Vault (E) — far from any vehicle so interact cannot steal the press.
  await page.keyboard.down('E');
  await page.waitForTimeout(120);
  await page.keyboard.up('E');
  await waitForState(page, () => window.tidebreak.getState().player.vaultCount > 0, 10000, 'vault');
  const vaulted = await page.evaluate(() => window.tidebreak.getState().player);

  await page.locator('#day-toggle').click();
  const night = await page.evaluate(() => window.tidebreak.getState());
  if (night.timeOfDay < 18) throw new Error(`Night control failed: ${night.timeOfDay}`);
  await page.locator('#rain-toggle').click();
  const storm = await page.evaluate(() => window.tidebreak.getState());
  if (!storm.raining) throw new Error('Rain toggle failed.');

  await page.locator('#controls-toggle').click();
  await page.locator('#controls-panel').waitFor({ state: 'visible' });
  await page.locator('[data-bind="sprint"]').click();
  await page.keyboard.press('G');
  if (await page.locator('[data-bind="sprint"]').textContent() !== 'G') throw new Error('Sprint remapping did not update.');
  await page.locator('#close-controls').click();

  // Sprint west (A + remapped sprint G) until reaching the coastline water.
  await page.keyboard.down('A');
  await page.keyboard.down('G');
  await waitForState(page, () => window.tidebreak.getState().player.swimming, 90000, 'reach coastline water');
  await page.keyboard.up('G');
  await page.keyboard.up('A');
  const swimming = await page.evaluate(() => window.tidebreak.getState());
  if (await page.locator('#movement-status').textContent() !== 'Swimming') throw new Error('Swimming state is missing from the HUD.');

  assertClean(signals);
  console.log(JSON.stringify({
    test: 'gameplay',
    threeVersion: initial.threeVersion,
    moved: walked.z < initial.player.z,
    jumped: jumped.jumpCount,
    vaulted: vaulted.vaultCount,
    nightTime: night.timeOfDay,
    rain: storm.raining,
    remappedSprint: 'G',
    swimmingAt: { x: swimming.player.x, z: swimming.player.z },
    consoleErrors: signals.consoleErrors,
    pageErrors: signals.pageErrors,
    externalRequests: signals.externalRequests,
  }, null, 2));
} finally {
  await browser.close();
}
