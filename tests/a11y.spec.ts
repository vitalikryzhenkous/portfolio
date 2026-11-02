import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.2 AA (and below) on every page, in both themes. A violation fails the build.
const PAGES = ['', 'how-i-work/', 'work/jev/', 'stack/', 'cv/'];
const THEMES = ['light', 'dark'] as const;
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const theme of THEMES) {
  for (const path of PAGES) {
    test(`axe ${theme} /${path}`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.help}`);
      expect(summary, summary.join('\n')).toEqual([]);
    });
  }
}

test('graph is usable from the keyboard', async ({ page }) => {
  await page.goto('how-i-work/');
  // The graph is an Astro island: its HTML exists before React hydrates. Wait for hydration.
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
  const node = page.locator('.react-flow__node-platform').first();
  // React Flow keeps nodes hidden until measured; focus() on a hidden node silently does nothing.
  await expect(node).toBeVisible();
  // Hydration may replace the server-rendered node element once; retry until focus sticks.
  await expect(async () => {
    await node.focus();
    await expect(node).toBeFocused({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await page.keyboard.press('Enter');
  await expect(page.locator('.pg-card')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.pg-card')).toHaveCount(0);
  await node.focus();
  await expect(node).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(page.locator('.pg-card')).toHaveCount(0);
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});
