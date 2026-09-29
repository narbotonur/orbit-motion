import { test, expect, type Page } from "@playwright/test";
import { observation } from "../fixtures.ts";
import { REPLAY, SECTORS, currentWave, swipeLane } from "../../src/game/engine.ts";
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
  const wave = currentWave(await state(page));
  await feed(page, { pointer: wave.source, pinch: false });
  await page.waitForTimeout(100);
  await feed(page, { pointer: wave.source, pinch: true, open: false });
  await expect.poll(async () => (await state(page)).carrying).toBe(true);
  await feed(page, { pointer: wave.dock, pinch: true, open: false });
  await page.waitForTimeout(100);
  await feed(page, { pointer: wave.dock });
  await expect.poll(async () => (await state(page)).task).toBe("charge");
  await expect.poll(async () => (await state(page)).task).toBe("clear");
  for (let i = 0; i < wave.lanes.length; i++) {
    const before = (await state(page)).event;
    await feed(page, {
      pointer: { x: 0.75, y: swipeLane(await state(page)) },
      swipeRight: true,
    });
    await expect
      .poll(async () => (await state(page)).event)
      .toBeGreaterThan(before);
  }
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
  await feed(page, { quality: "missing" });
  await expect.poll(async () => (await state(page)).paused).toBe(true);
  const pausedAt = (await state(page)).remaining;
  await page.waitForTimeout(1000);
  expect((await state(page)).remaining).toBe(pausedAt);
  await expect(
    page.getByText("Таймер на паузе · верни руку в кадр"),
  ).toBeVisible();
  for (let i = 0; i < SECTORS.length; i++) {
    for (let wave = 0; wave < SECTORS[i].waves.length; wave++) {
      await cycle(page);
      if (wave < SECTORS[i].waves.length - 1)
        await expect.poll(async () => (await state(page)).wave).toBe(wave + 1);
    }
    await expect.poll(async () => (await state(page)).module).toBe(i + 1);
    if (i === 0)
      expect(await page.evaluate(() => localStorage.getItem("orbit-motion:unlocked-level:v1"))).toBe("1");
    if (i < SECTORS.length - 1) {
      await phase(page, "interlude");
      if (i === 0)
        await page.screenshot({
          path: ".ops/screens/interlude.png",
          fullPage: true,
        });
      await phase(page, "playing");
      await expect(page.locator(".sector-status")).toContainText(
        SECTORS[i + 1].name,
      );
    }
  }
  await phase(page, "result");
  await expect(
    page.getByRole("heading", { name: "Станция снова в строю." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Первый шаг сделан" }),
  ).toBeVisible();
  expect((await state(page)).score).toBeGreaterThan(7500);
  expect(await page.evaluate(() => localStorage.getItem("orbit-motion:unlocked-level:v1"))).toBe("9");
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("orbit-motion:local-runs:v2") || "[]")
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
  await expect(page.getByRole("button", { name: "Уровень 10: Центральное ядро" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Уровень 10: Центральное ядро" })).toHaveAttribute("aria-pressed", "true");
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
