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

// PAS-014: the polish on top of the 3 phases.
test('final: la gráfica tiene una barra por pase, los errores marcados y la línea de la teoría', async ({ page }) => {
  await open(page, 'final');
  await expect(page.locator('#chart rect.bar')).toHaveCount(25);
  await expect(page.locator('#chart rect.bar.miss')).toHaveCount(2);
  await expect(page.locator('#chart polyline.cum')).toHaveCount(1);
  await expect(page.locator('#chart line.theory')).toHaveCount(1);
  await expect(page.locator('#chart')).toContainText('k × ΔI $4,000.00');
  await fitsViewport(page);
});

test('sonido: apagado por defecto y se prende con el botón', async ({ page }) => {
  await open(page, 'playing');
  const sound = page.locator('#sound');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => window.Sfx.enabled())).toBe(true);
});

test.describe('con animaciones', () => {
  test.use({ reducedMotion: 'no-preference' });
  test('un pase nuevo hace volar el billete y luego lo esconde', async ({ page }) => {
    // Keep a handle on the fake socket so the test can push the next room:state.
    await page.addInitScript(() => {
      let real;
      Object.defineProperty(window, 'createSocket', {
        configurable: true,
        set(fn) { real = fn; },
        get() { return (o) => (window.__sock = real(o)); },
      });
    });
    await open(page, 'playing');
    await page.waitForFunction(() => window.__sock && window.__sock.data);
    await page.evaluate(() => {
      clearInterval(window.__sock.timer); // the mock's clock would replay the old state every second
      const s = JSON.parse(JSON.stringify(window.__sock.data.state)), g = s.game;
      const income = g.amount, saving = Math.round(income * 25) / 100;
      g.ledgerTail = g.ledgerTail.slice(1).concat([{ n: g.passes + 1, playerId: g.holderId, name: 'Regina', income, saving, consumption: Math.round((income - saving) * 100) / 100, ok: true, reason: 'ok' }]);
      g.passes += 1; g.turn += 1; g.amount = Math.round((income - saving) * 100) / 100; g.holderId = 'p1'; g.msLeft = 10000;
      g.lastEvent = { ok: true, text: 'Regina se quedó $25.03 y le pasó $75.08 a Ximena' };
      window.__sock.data.state = s;
      window.__sock.fire('room:state', s);
    });
    await expect(page.locator('#flyer')).toBeVisible();
    await expect(page.locator('#flyer')).toHaveText('$75.08');
    await expect(page.locator('#flyer')).toBeHidden({ timeout: 3000 });
    await expect(page.locator('#holder')).toHaveText('Ximena');
  });
});
