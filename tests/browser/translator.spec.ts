import { test, expect } from "@playwright/test";
import { movedHand } from "../fixtures.ts";

test("translator records a two-hand gesture and turns it into text", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?mode=translator&test=1");
  await expect(page.getByRole("heading", { name: "Добавь слово" })).toBeVisible();
  await expect(page.getByText("Это распознавание персональных жестов")).toBeVisible();
  await page.getByRole("button", { name: "Подключить камеру" }).click();
  await expect(page.getByText("● В эфире")).toBeVisible({ timeout: 45000 });

  const hands = [movedHand(.3, .5, .55), movedHand(.7, .5, .55)];
  await page.evaluate((points) => {
    const target = window as any;
    target.__translatorHands = points;
    target.__translatorFeed = window.setInterval(() => {
      target.__translatorTest.feed({
        at: performance.now(),
        hands: target.__translatorHands,
        handedness: ["Left", "Right"],
      });
    }, 55);
  }, hands);
  await page.getByLabel("Слово или короткая фраза").fill("Сигнал");
  await page.getByRole("button", { name: "Записать 3 повтора" }).click();
  await expect(page.getByText("«Сигнал» добавлено.", { exact: false })).toBeVisible({ timeout: 30000 });
  await expect(page.locator(".translator-vocabulary li")).toHaveCount(1);
  await expect(page.locator(".translator-vocabulary li")).toContainText("две руки");
  await page.evaluate(() => { (window as any).__translatorHands = []; });
  await page.waitForTimeout(700);
  await page.evaluate((points) => { (window as any).__translatorHands = points; }, hands);
  await expect(page.locator(".translator-sentence")).toHaveText("Сигнал", { timeout: 10000 });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("orbit-motion:personal-gestures:v1") || "[]").length)).toBe(1);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: ".ops/screens/translator-mobile.png", fullPage: true });
  await page.evaluate(() => clearInterval((window as any).__translatorFeed));
  await page.getByRole("button", { name: "Отключить" }).click();
  await expect(page.getByRole("button", { name: "Подключить камеру" })).toBeVisible();
  await page.reload();
  await expect(page.locator(".translator-vocabulary li")).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Удалить жест Сигнал" }).click();
  await expect(page.locator(".translator-vocabulary li")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".translator-vocabulary li")).toHaveCount(0);
  expect(errors).toEqual([]);
});
