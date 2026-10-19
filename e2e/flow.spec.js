// End to end on the real server: a projector, two phones and five bots play a $1,000 / PMC 0.75 round.
const { test, expect } = require('@playwright/test');

test.describe.configure({ mode: 'serial' });
test.setTimeout(180000);

const moneyToNumber = (text) => Number(text.replace(/[$,]/g, ''));
const round2 = (x) => Math.round(x * 100) / 100;

async function phone(browser, code, name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`/play.html?code=${code}`);
  await page.locator('#name').fill(name);
  await page.locator('#join-form button[type="submit"], #join-form button').first().click();
  await expect(page.locator('#s-wait')).toBeVisible();
  return page;
}

// If this phone holds the money, answer (right or wrong) and pass it to `to`. Returns true when it played.
async function playIfMyTurn(page, { right, to }) {
  if (!(await page.locator('#s-turn').isVisible())) return false;
  await page.waitForTimeout(1200); // a person needs more than a second; the server allows 1 action/s (IDEA 4.7)
  const amount = moneyToNumber(await page.locator('#turn-amount').innerText());
  await page.locator('#saving').fill(String(right ? round2(amount * 0.25) : round2(amount * 0.25 + 7)));
  await page.locator('#mates button', { hasText: to }).first().click();
  await page.locator('#go').click();
  await expect(page.locator('#s-turn')).toBeHidden({ timeout: 5000 });
  return true;
}

test('una ronda completa con proyector, dos celulares y bots', async ({ browser }) => {
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
  const host = await hostCtx.newPage();
  await host.goto('/host.html');
  await expect(host.locator('#code')).toHaveText(/^[A-Z]{4}$/);
  const code = await host.locator('#code').innerText();
  await expect(host.locator('#qr')).toHaveAttribute('src', /^data:image\/png;base64,/);

  const ana = await phone(browser, code, 'Ana');
  const luis = await phone(browser, code, 'Luis');
  await expect(host.locator('#count')).toHaveText('2');
  await expect(host.locator('#chips')).toContainText('Ana');

  await host.locator('#bots').click();
  await expect(host.locator('#chips .chip')).toHaveCount(7);
  await expect(host.locator('#k-preview')).toContainText('$4,000.00');
  await host.locator('#start').click();
  await expect(host.locator('body')).toHaveAttribute('data-phase', 'playing');
  await expect(ana.locator('section.screen:not([hidden])')).toHaveAttribute('id', /^s-(other|turn)$/);

  // Play until each phone answered once and the chain has 5+ passes.
  let anaPlayed = 0, luisPlayed = 0;
  const deadline = Date.now() + 120000;
  while ((anaPlayed < 1 || luisPlayed < 1 || Number(await host.locator('#m-turn').innerText()) < 6) && Date.now() < deadline) {
    if (await playIfMyTurn(ana, { right: true, to: 'Luis' })) anaPlayed++;
    if (await playIfMyTurn(luis, { right: false, to: 'Ana' })) luisPlayed++;
    await host.waitForTimeout(250);
  }
  expect(anaPlayed).toBeGreaterThan(0);
  expect(luisPlayed).toBeGreaterThan(0);
  await expect(host.locator('#track li[data-ok="false"]').first()).toBeAttached();

  // A phone reloads mid game: same player, saving kept. The projector reloads: same room.
  await ana.reload();
  await expect(ana.locator('section.screen:not([hidden])')).toHaveAttribute('id', /^s-(other|turn|passed)$/);
  await host.reload();
  await expect(host.locator('body')).toHaveAttribute('data-phase', 'playing');
  await expect(host.locator('#m-code')).toHaveText(code);
  await expect(host.locator('#track li')).not.toHaveCount(0);

  // End the round from the projector (two-step button).
  await host.locator('#end').click();
  await host.locator('#end').click();
  await expect(host.locator('body')).toHaveAttribute('data-phase', 'final');
  await expect(host.locator('.verdict')).toContainText('$1,000.00 de inversión movieron');
  await expect(host.locator('#f-theory')).toHaveText('$4,000.00');
  const moved = moneyToNumber(await host.locator('#f-moved').innerText());
  expect(moved).toBeGreaterThan(1000);
  expect(moved).toBeLessThanOrEqual(4000);
  await expect(host.locator('#ledger tr').first()).toBeAttached();
  await expect(ana.locator('#s-final')).toBeVisible();
  await expect(luis.locator('#s-final')).toBeVisible();
  await expect(ana.locator('#final-sentence')).toContainText('$1,000.00');
});
