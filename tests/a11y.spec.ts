import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// WCAG 2.2 AA (and below) on every page, in both themes. A violation fails the build.
const PAGES = ['', 'work/', 'how-i-work/', 'work/jev/', 'work/platform/', 'work/babyloop/', 'work/status-board/', 'work/interview-gym/', 'stack/', 'cv/'];
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
  const card = page.locator('.pg-card');
  // React Flow keeps nodes hidden until measured, and hydration may replace the node element once:
  // retry focus + Enter until the card opens.
  const openWithKeyboard = () =>
    expect(async () => {
      await node.focus();
      await expect(node).toBeFocused({ timeout: 500 });
      await page.keyboard.press('Enter');
      await expect(card).toBeVisible({ timeout: 500 });
    }).toPass({ timeout: 10_000 });

  await openWithKeyboard();
  await page.keyboard.press('Escape');
  await expect(card).toHaveCount(0);

  await openWithKeyboard();
  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(card).toHaveCount(0);
});

test('skip link moves focus to main content', async ({ page }) => {
  await page.goto('');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('replay steps forward and back from the keyboard', async ({ page }) => {
  await page.goto('work/platform/');
  const replay = page.getByRole('region', { name: /Replay/ });
  await replay.scrollIntoViewIfNeeded();
  await page.waitForSelector('astro-island:not([ssr])', { state: 'attached' });
  const log = replay.getByRole('list', { name: 'Event log' }).locator('> li');
  const next = replay.getByRole('button', { name: 'Next ▶' });
  await expect(async () => {
    const before = await log.count();
    await next.focus();
    await page.keyboard.press('Enter');
    await expect(log).toHaveCount(before + 1, { timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await replay.getByRole('button', { name: '◀ Back' }).click();
  await expect(replay.getByRole('list', { name: 'Phases' }).locator('> li')).toHaveCount(6);
});

test('case cards are clickable anywhere, with one link each', async ({ page }) => {
  await page.goto('work/');
  const card = page.locator('.card-link').first();
  const links = card.getByRole('link');
  await expect(links).toHaveCount(1);
  const box = await card.boundingBox();
  if (!box) throw new Error('card not rendered');
  await page.mouse.click(box.x + 12, box.y + box.height - 12); // bottom-left corner, away from the title
  await expect(page).toHaveURL(/\/work\/[a-z-]+\/$/);
});
