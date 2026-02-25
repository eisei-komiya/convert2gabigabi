import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

test.beforeAll(() => {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
});

test('メイン画面のスクリーンショット', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'main.png'),
    fullPage: true,
  });
});

test('メイン画面 - デスクトップ幅', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, 'main-desktop.png'),
    fullPage: true,
  });
});
