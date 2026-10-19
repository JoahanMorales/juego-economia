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

// The saving a phone shows when it does not hold the money (null while it is its turn).
async function visibleSaved(page) {
  const id = await page.locator('section.screen:not([hidden])').getAttribute('id');
  if (id === 's-other') return page.locator('#other-saved').innerText();
  if (id === 's-passed') return page.locator('#passed-saved').innerText();
  return null;
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

  // The slide's case: $1,000 and PMC 0.75 (k = 4). The UI adds bots 5 at a time.
  await host.locator('#inv').fill('1000');
  await host.locator('#pmc').fill('0.75');
  await host.locator('#pmc').press('Enter');
  await expect(host.locator('#inv')).toHaveValue(/^1,?000(\.00)?$/);
  await expect(host.locator('#pmc')).toHaveValue('0.75');
  await expect(host.locator('#k-preview')).toContainText('k = 4');
  await expect(host.locator('#k-preview')).toContainText('$4,000.00');
  await host.waitForTimeout(1100); // the server allows 1 action/s per socket
  await host.locator('#bots').click();
  await expect(host.locator('#chips .chip')).toHaveCount(7);
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

  // A phone reloads mid game: same player and same saving. Luis now passes to the bots so Ana is
  // usually not holding the money when we read her saving.
  let savedBefore = null;
  for (let i = 0; i < 80 && savedBefore === null; i++) {
    await playIfMyTurn(ana, { right: true, to: 'Luis' });
    await playIfMyTurn(luis, { right: true, to: 'Bot' });
    savedBefore = await visibleSaved(ana);
  }
  expect(savedBefore).toMatch(/^\$[\d,]+\.\d{2}$/);
  expect(moneyToNumber(savedBefore)).toBeGreaterThan(0);
  await ana.reload();
  await expect(ana.locator('section.screen:not([hidden])')).toHaveAttribute('id', /^s-(other|turn|passed)$/);
  const savedAfter = await visibleSaved(ana);
  if (savedAfter !== null) expect(savedAfter).toBe(savedBefore); // null only if the money reached Ana meanwhile
  // No duplicate player: when Luis holds the money, Ana is in his list once and there is no "Ana 2".
  for (let i = 0; i < 120 && !(await luis.locator('#s-turn').isVisible()); i++) {
    await playIfMyTurn(ana, { right: true, to: 'Luis' });
    await luis.waitForTimeout(250);
  }
  await expect(luis.locator('#mates button', { hasText: /^Ana$/ })).toHaveCount(1);
  await expect(luis.locator('#mates button', { hasText: 'Ana 2' })).toHaveCount(0);
  await playIfMyTurn(luis, { right: false, to: 'Ana' });

  // The projector reloads: same room, same game.
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
