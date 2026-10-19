// Phone screens against the mock sockets (public/mock/*.json) at 390x844, reduced motion.
const { test, expect } = require('@playwright/test');

async function open(page, mock, playerId) {
  if (playerId) {
    await page.addInitScript((id) => {
      localStorage.setItem('pasala.player', JSON.stringify({ code: 'KFTR', playerId: id, name: 'Regina' }));
    }, playerId);
  }
  await page.goto('/play.html?mock=' + mock);
}

async function noOverflow(page) {
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(390);
  // html clips overflow, so also check that no visible element pokes out past the viewport
  const out = await page.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((el) => el.offsetParent !== null && el.getBoundingClientRect().right > 391).length);
  expect(out).toBe(0);
}

test.beforeEach(({}, testInfo) => test.skip(testInfo.project.name !== 'phone', 'phone only'));

test('join: code from the URL, Spanish errors inline', async ({ page }) => {
  await page.goto('/play.html?mock=lobby&code=kftr');
  await expect(page.locator('#s-join')).toBeVisible();
  await expect(page.locator('#code')).toHaveValue('KFTR');
  await page.locator('#join-form button').click();
  await expect(page.locator('#join-err')).toHaveText('Escribe tu nombre.');
  await noOverflow(page);
});

test('lobby with a stored player shows waiting', async ({ page }) => {
  await open(page, 'lobby', 'p1');
  await expect(page.getByText('¡Estás dentro!')).toBeVisible();
  await expect(page.locator('#wait-saved')).toHaveText('$0.00');
  await noOverflow(page);
});

test('someone else has the money', async ({ page }) => {
  await open(page, 'playing', 'p2');
  await expect(page.locator('#other-name')).toHaveText('Regina');
  await expect(page.locator('#other-amount')).toHaveText('$100.11');
  await expect(page.getByText('Atento: te lo pueden pasar a ti')).toBeVisible();
  await noOverflow(page);
});

test('your turn: hot screen, teammates, pass', async ({ page }) => {
  await open(page, 'myturn', 'p5');
  await expect(page.getByRole('heading', { name: 'Tu turno' })).toBeVisible();
  await expect(page.locator('#turn-amount')).toHaveText('$100.11');
  await expect(page.locator('#saving')).toHaveAttribute('inputmode', 'decimal');
  await expect(page.locator('#turn-hint')).toHaveText('PMC 0.75. Te quedas con lo que no consumes.');
  await expect(page.locator('#mates button')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Santiago' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /Bot Tendera/ })).toBeEnabled();
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(255, 106, 61)');
  const h = await page.locator('#mates button').first().evaluate((b) => b.getBoundingClientRect().height);
  expect(h).toBeGreaterThanOrEqual(48);
  await noOverflow(page);

  await page.locator('#go').click();
  await expect(page.locator('#turn-err')).toHaveText('Escribe cuánto te ahorras, por ejemplo 25.03.');
  await page.locator('#saving').fill('25,03');
  await page.locator('#go').click();
  await expect(page.locator('#turn-err')).toHaveText('Elige a quién se lo pasas.');
  await page.getByRole('button', { name: 'Diego' }).click();
  await expect(page.getByRole('button', { name: 'Diego' })).toHaveAttribute('aria-pressed', 'true');
  const sent = page.waitForEvent('console', (m) => m.text().includes('[mock] emit player:pass'));
  await page.locator('#go').click();
  expect((await sent).text()).toContain('saving: 25.03, toId: p2');
  await expect(page.getByText('¡Pasada!')).toBeVisible();
});

test('passed', async ({ page }) => {
  await open(page, 'passed', 'p1');
  await expect(page.getByText('¡Pasada!')).toBeVisible();
  await expect(page.getByText('Mira el proyector.')).toBeVisible();
  await noOverflow(page);
});

test('final: place, saving and the multiplier sentence', async ({ page }) => {
  await open(page, 'final', 'p3');
  await expect(page.locator('#final-place')).toHaveText('#6');
  await expect(page.locator('#final-saved')).toHaveText('$12.77');
  await expect(page.locator('#final-sentence')).toHaveText('$1,000.00 de inversión movieron $3,996.86 en la economía.');
  await expect(page.locator('#final-formula')).toContainText('k = 1 / (1 - 0.75) = 4');
  await noOverflow(page);
});
