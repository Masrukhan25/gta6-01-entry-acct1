import { assertClean, enterMaravela, observePage, openBrowser } from './playwright-support.mjs';

const browser = await openBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const signals = observePage(page);

try {
  await enterMaravela(page);
  await page.keyboard.down('A');
  await page.keyboard.down('Shift');
  const sample = await page.evaluate(() => new Promise((resolve) => {
    const deltas = [];
    let previous = 0;
    let start = 0;
    const capture = (timestamp) => {
      if (!start) start = timestamp;
      if (previous) deltas.push(timestamp - previous);
      previous = timestamp;
      if (timestamp - start >= 5000) {
        const durationSeconds = (timestamp - start) / 1000;
        const averageFps = deltas.length / durationSeconds;
        const sorted = [...deltas].sort((left, right) => left - right);
        resolve({
          durationSeconds,
          frames: deltas.length,
          averageFps: Number(averageFps.toFixed(1)),
          p95FrameMs: Number(sorted[Math.floor(sorted.length * 0.95)]?.toFixed(2) ?? 0),
          moved: window.tidebreak.getState().player.x < -174,
          drawCalls: window.tidebreak.getState().renderer.calls,
        });
        return;
      }
      requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  }));
  await page.keyboard.up('Shift');
  await page.keyboard.up('A');
  if (!sample.frames || !sample.moved) throw new Error(`Performance sample did not capture a moving player: ${JSON.stringify(sample)}`);
  assertClean(signals);
  console.log(JSON.stringify({
    test: 'performance',
    measurement: 'requestAnimationFrame deltas for five seconds while sprinting through the Boardwalk toward the coast',
    ...sample,
    consoleErrors: signals.consoleErrors,
    pageErrors: signals.pageErrors,
    externalRequests: signals.externalRequests,
  }, null, 2));
} finally {
  await browser.close();
}
