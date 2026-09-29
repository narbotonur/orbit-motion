import { test, expect, type Page } from "@playwright/test";
import { observation } from "../fixtures.ts";
import { DOCK, SOURCE, REPLAY } from "../../src/game/engine.ts";
import type { Game } from "../../src/game/engine.ts";
import type { Observation } from "../../src/vision/gestures.ts";

async function feed(page: Page, patch: Partial<Observation> = {}) {
  await page.evaluate(
    (o) => (window as any).__orbitTest.observe(o),
    observation(patch),
  );
}
async function state(page: Page) {
  return page.evaluate(() =>
    (window as any).__orbitTest.state(),
  ) as Promise<Game>;
}
async function phase(page: Page, name: string) {
  await expect.poll(async () => (await state(page)).phase).toBe(name);
}
async function cycle(page: Page) {
  await feed(page, { pointer: SOURCE, pinch: false });
  await page.waitForTimeout(100);
  await feed(page, { pointer: SOURCE, pinch: true, open: false });
  await expect.poll(async () => (await state(page)).carrying).toBe(true);
  await feed(page, { pointer: DOCK, pinch: true, open: false });
  await page.waitForTimeout(100);
  await feed(page, { pointer: DOCK });
  await expect.poll(async () => (await state(page)).task).toBe("charge");
  await expect.poll(async () => (await state(page)).task).toBe("clear");
  await feed(page, { swipeRight: true });
  await page.waitForTimeout(120);
}
test("real WASM initializes, then deterministic observations complete the UI flow", async ({
  page,
}) => {
  const uncaught: string[] = [];
  page.on("pageerror", (e) => uncaught.push(e.message));
  await page.goto("/?test=1");
  await page.getByRole("button", { name: "Подключить камеру" }).click();
  await expect(
    page.getByRole("heading", { name: "Установим связь" }),
  ).toBeVisible({ timeout: 45000 });
  await feed(page);
  await phase(page, "tutorial");
  await cycle(page);
  await phase(page, "ready");
  await feed(page, { open: false });
  await page.waitForTimeout(100);
  await feed(page);
  await phase(page, "playing");
  await page.screenshot({ path: ".ops/screens/mission.png", fullPage: true });
  const before = (await state(page)).remaining;
  await feed(page, { quality: "missing" });
  await page.waitForTimeout(1000);
  expect((await state(page)).remaining).toBeGreaterThanOrEqual(before - 60);
  await expect(
    page.getByText("Таймер на паузе · верни руку в кадр"),
  ).toBeVisible();
  for (let i = 0; i < 3; i++) await cycle(page);
  await phase(page, "result");
  await expect(
    page.getByRole("heading", { name: "Станция снова в строю." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Первый шаг сделан" }),
  ).toBeVisible();
  expect((await state(page)).score).toBeGreaterThan(1050);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("orbit-motion:local-runs:v1") || "[]")
          .length,
    ),
  ).toBe(1);
  await page.screenshot({ path: ".ops/screens/result.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".ops/screens/mobile-result.png",
    fullPage: true,
  });
  await feed(page, { open: false });
  await page.waitForTimeout(100);
  await feed(page, { pointer: REPLAY });
  await phase(page, "ready");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Подключить камеру" }),
  ).toBeVisible();
  expect(uncaught).toEqual([]);
});
test("camera denial is recoverable with instructions and retry", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Подключить камеру" }).click();
  await expect(
    page.getByRole("heading", { name: "Не получилось подключиться" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Попробовать снова" }),
  ).toBeVisible();
  await expect(page.locator(".loading-field")).toContainText("Разреши доступ");
  await page.getByRole("button", { name: "Вернуться на главную" }).click();
  await expect(
    page.getByRole("button", { name: "Подключить камеру" }),
  ).toBeVisible();
});
test("mobile landing fits and has no automatic camera request", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Подключить камеру" }),
  ).toBeVisible();
  expect(await page.locator("video").count()).toBe(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
