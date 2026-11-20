import { openBrowser, observePage } from './playwright-support.mjs';

const browser = await openBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const { consoleErrors, pageErrors, externalRequests } = observePage(page);

try {
  const response = await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  await page.locator('#game-title').waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#scene');
    return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
  });

  const result = await page.evaluate(() => {
    const canvas = document.querySelector('#scene');
    const gl = canvas.getContext('webgl2');
    return {
      title: document.title,
      heading: document.querySelector('#game-title')?.textContent?.trim(),
      canvas: { width: canvas.width, height: canvas.height },
      webgl: Boolean(gl),
      webglVersion: gl?.getParameter(gl.VERSION),
    };
  });

  await page.locator('#enter-city').click();
  const startedMessage = await page.locator('#status').textContent();
  if (!response?.ok()) throw new Error(`Page response failed: ${response?.status()}`);
  if (result.heading !== 'TIDEBREAK' || !result.webgl || !result.webglVersion || result.canvas.width < 1 || result.canvas.height < 1) {
    throw new Error(`Title or rendered canvas missing: ${JSON.stringify(result)}`);
  }
  if (!startedMessage?.includes('Maravela')) throw new Error('Title screen button did not respond.');
  if (consoleErrors.length || pageErrors.length || externalRequests.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, externalRequests }));
  }

  console.log(JSON.stringify({ ...result, startedMessage, consoleErrors, pageErrors, externalRequests }, null, 2));
} finally {
  await browser.close();
}
