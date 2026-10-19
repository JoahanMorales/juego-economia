// Projector screen on the mock states (public/mock/*.json, built from src/game.js). 1280×720, reduced motion.
const { test, expect } = require('@playwright/test');

async function open(page, mock) {
  await page.goto(`/host.html?mock=${mock}`);
  await expect(page.locator('body')).toHaveAttribute('data-phase', mock === 'final' ? 'final' : mock === 'lobby' ? 'lobby' : 'playing');
  await page.evaluate(() => document.fonts.ready);
}

async function fitsViewport(page) {
  const o = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  expect(o.w).toBeLessThanOrEqual(1280);
  expect(o.h).toBeLessThanOrEqual(720);
}

test('lobby: código, QR, jugadores y controles', async ({ page }) => {
  await open(page, 'lobby');
  await expect(page.locator('#code')).toHaveText('KFTR');
  await expect(page.locator('#qr')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('#chips .chip')).toHaveCount(7);
  await expect(page.locator('#chips .chip.off')).toHaveText(/Santiago/);
  await expect(page.locator('#chips')).toContainText('🤖 Bot Tendera');
  await expect(page.locator('#count')).toHaveText('6');
  await expect(page.locator('#start')).toBeEnabled();
  await expect(page.locator('#presets .preset')).toHaveCount(3);
  await expect(page.locator('#k-preview')).toContainText('$4,000.00');
  await fitsViewport(page);
});

test('en juego: quién tiene el dinero, reloj, total movido, ranking y cadena', async ({ page }) => {
  await open(page, 'playing');
  await expect(page.locator('#holder')).toHaveText('Regina');
  await expect(page.locator('#amount')).toHaveText('$100.11');
  await expect(page.locator('#moved')).toHaveText('$3,599.52');
  await expect(page.locator('#theory')).toHaveText('$4,000.00');
  await expect(page.locator('#event-text')).toHaveText('Ximena se quedó $33.37 y le pasó $100.11 a Regina');
  await expect(page.locator('#secs')).toHaveText(/^\d+$/);
  await expect(page.locator('#rank li')).toHaveCount(5);
  await expect(page.locator('#track li')).toHaveCount(9);
  await expect(page.locator('#track li.now .nm')).toHaveText('Regina');
  await expect(page.locator('#track li[data-ok="false"]')).toHaveCount(2);
  await fitsViewport(page);
});

test('final: movido contra teoría, podio y la cadena completa', async ({ page }) => {
  await open(page, 'final');
  await expect(page.locator('.verdict')).toContainText('$1,000.00 de inversión movieron $3,996.86 en la economía');
  await expect(page.locator('#f-theory')).toHaveText('$4,000.00');
  await expect(page.locator('#f-k')).toHaveText('k = 1 / (1 − 0.75) = 4');
  await expect(page.locator('#podium li')).toHaveCount(3);
  await expect(page.locator('#podium li').first()).toContainText('Ximena');
  await expect(page.locator('#ledger tr')).toHaveCount(25);
  await expect(page.locator('#t-income')).toHaveText('$3,996.86');
  await expect(page.locator('#again')).toBeVisible();
  await fitsViewport(page);
});

test('sin guiones largos ni colores fuera de los tokens en el texto visible', async ({ page }) => {
  for (const mock of ['lobby', 'playing', 'final']) {
    await open(page, mock);
    const text = await page.evaluate(() => document.body.innerText);
    expect(text).not.toMatch(/[—–]/);
  }
});
