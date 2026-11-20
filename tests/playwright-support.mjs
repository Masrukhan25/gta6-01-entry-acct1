import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const compatiblePlaywright = '/home/hatch/workspace/tools/playwright-shot/node_modules/playwright-core';

export async function openBrowser() {
  const candidates = [process.env.PLAYWRIGHT_CORE_PATH, compatiblePlaywright].filter(Boolean);
  let lastError;
  for (const path of [...new Set(candidates)]) {
    try {
      const { chromium } = require(path);
      return await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`Could not launch compatible Playwright Chromium: ${lastError?.message ?? 'no runtime candidate'}`);
}

export function observePage(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const externalRequests = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== 'http://localhost:8080') externalRequests.push(request.url());
  });
  return { consoleErrors, pageErrors, externalRequests };
}

export async function enterMaravela(page) {
  const response = await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`Page response failed: ${response?.status()}`);
  await page.locator('#enter-city').click();
  await page.locator('#game-hud').waitFor({ state: 'visible' });
  return response;
}

export function assertClean({ consoleErrors, pageErrors, externalRequests }) {
  if (consoleErrors.length || pageErrors.length || externalRequests.length) {
    throw new Error(JSON.stringify({ consoleErrors, pageErrors, externalRequests }));
  }
}
