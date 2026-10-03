import { expect, test } from "@playwright/test";
import { observation } from "../fixtures.ts";

async function untranslated(page: import("@playwright/test").Page) {
  return page.locator("body").innerText().then((text) =>
    text.split("\n").map((line) => line.trim()).filter((line) => /[А-Яа-яЁё]/.test(line)),
  );
}

test("English game keeps landing, calibration and feedback in English", async ({ page }) => {
  await page.goto("/?test=1&lang=en");
  await expect(page.getByRole("button", { name: "Connect camera" })).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /10-level webcam-controlled game/);
  expect(await untranslated(page)).toEqual([]);
  await page.screenshot({ path: ".ops/screens/english-landing.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Connect camera" }).click();
  await expect(page.getByRole("heading", { name: "Let's establish a connection" })).toBeVisible({ timeout: 45000 });
  expect(await untranslated(page)).toEqual([]);
  for (const phase of ["tutorial", "ready", "interlude"] as const) {
    await page.evaluate((nextPhase) => {
      const game = (window as any).__orbitTest.state();
      game.phase = nextPhase;
      game.interludeRemaining = 10000;
      if (nextPhase === "interlude") game.module = 1;
    }, phase);
    await expect(page.locator(`.playfield.phase-${phase}`)).toBeVisible();
    expect(await untranslated(page)).toEqual([]);
  }
  await page.evaluate(() => {
    const game = (window as any).__orbitTest.state();
    game.phase = "playing";
    game.task = "signal";
    game.hint = "Левой рукой найди частоту. Правой захвати провод СПРАВА и тяни к центру.";
  });
  await expect(page.getByRole("heading", { name: "Mission results" })).not.toBeVisible();
  await expect(page.locator(".task-signal .frequency-rail")).toBeVisible();
  await page.evaluate((hand) => (window as any).__orbitTest.observe(hand),
    observation({ partner: observation({ pointer: { x: 0.15, y: 0.1 } }) }));
  await expect(page.getByText("Frequency too high — lower your left hand.")).toBeVisible();
  expect(await untranslated(page)).toEqual([]);
  await page.evaluate(() => {
    const game = (window as any).__orbitTest.state();
    game.phase = "result";
    game.finished = true;
    game.module = 10;
    game.score = 1000;
  });
  await expect(page.getByRole("heading", { name: "The station is back online." })).toBeVisible();
  expect(await untranslated(page)).toEqual([]);
  await page.screenshot({ path: ".ops/screens/english-result.png", fullPage: true });
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Connect camera" })).toBeVisible();
  await page.getByRole("button", { name: "Переключить на русский" }).click();
  await expect(page.getByRole("button", { name: "Подключить камеру" })).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /игра на 10 уровней/);
  await page.reload();
  await expect(page.getByRole("button", { name: "Подключить камеру" })).toBeVisible();
});

test("experimental lab is separate and has an English interface", async ({ page }) => {
  await page.goto("/?mode=translator&lang=en");
  await expect(page.getByRole("heading", { name: "Show a gesture." })).toBeVisible();
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /not a validated sign-language translator/);
  expect(await untranslated(page)).toEqual([]);
  await expect(page.getByText("not a full International Sign translator")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Connect camera" }).click();
  await expect(page.getByRole("button", { name: "Disconnect" })).toBeVisible({ timeout: 45000 });
  expect(await untranslated(page)).toEqual([]);
});
