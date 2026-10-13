import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
const saved = async (page: Page) =>
  page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open("director-studio", 1);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    const read = (store: string, key: string) =>
      new Promise<any>((res, rej) => {
        const r = db.transaction(store).objectStore(store).get(key);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    return await read("projects", await read("settings", "last"));
  });
const waitSave = async (page: Page) => {
  await expect(page.locator(".save-state")).toHaveText("Сохранено в браузере");
  await page.waitForTimeout(1000);
};
const start = async (page: Page) => {
  await page.goto("/");
  await expect(page.getByLabel("Название проекта")).toHaveValue(
    "Разговор в офисе",
  );
  await expect(page.locator(".frame-image img")).toHaveCount(3);
  await waitSave(page);
};

test("cameras, immutable shots, undo, persistence, target deletion and JSON round trip", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const initial = await saved(page);
  // Editor orbit must never modify the shooting camera.
  const canvas = page.locator(".editor-canvas canvas");
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(
    bounds.x + bounds.width * 0.6,
    bounds.y + bounds.height * 0.7,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width * 0.8,
    bounds.y + bounds.height * 0.6,
    { steps: 12 },
  );
  await page.mouse.up();
  await page
    .getByRole("button", { name: "Сохранить проект", exact: true })
    .click();
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  expect((await saved(page)).scene.cameras).toEqual(initial.scene.cameras);
  // Free camera at floor level and rollback.
  await page.locator(".entity").filter({ hasText: "Общий" }).click();
  await page.getByLabel("Y · м", { exact: true }).fill("0.15");
  await waitSave(page);
  expect((await saved(page)).scene.cameras[0].position[1]).toBe(0.15);
  await page
    .getByRole("button", { name: "Отменить · Ctrl Z", exact: true })
    .click();
  await expect(page.getByLabel("Y · м", { exact: true })).toHaveValue(
    String(Number(initial.scene.cameras[0].position[1].toFixed(3))),
  );
  await page.getByLabel("Y · м", { exact: true }).fill("0.18");
  await page
    .getByRole("button", { name: "Сохранить кадр", exact: true })
    .click();
  await expect(page.locator(".frame-card")).toHaveCount(4);
  await page.getByLabel("Y · м", { exact: true }).fill("1.6");
  await waitSave(page);
  const changed = await saved(page);
  expect(changed.frames[3].scene.cameras[0].position[1]).toBe(0.18);
  expect(changed.frames[0]).toEqual(initial.frames[0]);
  await page.getByLabel("Название проекта").fill("Проверка сохранения");
  await waitSave(page);
  await page.reload();
  await expect(page.getByLabel("Название проекта")).toHaveValue(
    "Проверка сохранения",
  );
  await expect(page.locator(".frame-card")).toHaveCount(4);
  // Delete a character that several cameras point at.
  await page.locator(".entity").filter({ hasText: "Алексей" }).click();
  await page.getByRole("button", { name: "Удалить", exact: true }).click();
  await waitSave(page);
  const removed = await saved(page);
  expect(removed.scene.objects.some((o: any) => o.name === "Алексей")).toBe(
    false,
  );
  expect(
    removed.scene.cameras.some(
      (c: any) => c.targetId === initial.scene.objects[0].id,
    ),
  ).toBe(false);
  // Export real JSON and re-import as another project.
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const dlPromise = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Проект · JSON (резервная копия)",
      exact: true,
    })
    .click();
  const dl = await dlPromise;
  const path = (await dl.path())!;
  const json = JSON.parse(await readFile(path, "utf8"));
  expect(json.scene).toEqual(removed.scene);
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Некорректный проект" }),
  ).toBeVisible();
  await expect(page.getByLabel("Название проекта")).toHaveValue(
    "Проверка сохранения",
  );
  await page.locator("input[type=file]").setInputFiles(path);
  await expect(
    page.getByRole("status").filter({ hasText: "Проект импортирован" }),
  ).toBeVisible();
  await expect.poll(async () => (await saved(page))?.id).not.toBe(json.id);
  await waitSave(page);
  const imported = await saved(page);
  expect(imported.scene).toEqual(json.scene);
  expect(imported.frames).toEqual(json.frames);
  expect(imported.id).not.toBe(json.id);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/editor.png", fullPage: true });
});

test("PNG export dimensions, content and preview correspondence; ZIP and sheet", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const dlPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Текущий вид камеры · PNG", exact: true })
    .click();
  const dl = await dlPromise;
  const png = await readFile((await dl.path())!);
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1080);
  expect(png.length).toBeGreaterThan(20000);
  const comparison = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 72;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0, 128, 72);
    const exported = ctx.getImageData(0, 0, 128, 72).data;
    const preview = document.querySelector(
      ".camera-image canvas",
    ) as HTMLCanvasElement;
    await new Promise<void>((res) =>
      requestAnimationFrame(() => {
        ctx.drawImage(preview, 0, 0, 128, 72);
        res();
      }),
    );
    const shown = ctx.getImageData(0, 0, 128, 72).data;
    let delta = 0,
      lit = 0;
    for (let i = 0; i < exported.length; i += 4) {
      delta +=
        Math.abs(exported[i] - shown[i]) +
        Math.abs(exported[i + 1] - shown[i + 1]) +
        Math.abs(exported[i + 2] - shown[i + 2]);
      if (exported[i] + exported[i + 1] + exported[i + 2] > 100) lit++;
    }
    return { delta: delta / (128 * 72 * 3), lit };
  }, png.toString("base64"));
  expect(comparison.lit).toBeGreaterThan(8000);
  expect(comparison.delta).toBeLessThan(15);
  await page.getByLabel("Формат кадра", { exact: true }).selectOption("9:16");
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const portraitPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Текущий вид камеры · PNG", exact: true })
    .click();
  const portrait = await readFile((await (await portraitPromise).path())!);
  expect(portrait.readUInt32BE(16)).toBe(1080);
  expect(portrait.readUInt32BE(20)).toBe(1920);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const zipPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Все кадры · ZIP", exact: true })
    .click();
  const zip = await readFile((await (await zipPromise).path())!);
  expect(zip.subarray(0, 2).toString()).toBe("PK");
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  const sheetPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Лист раскадровки · PNG", exact: true })
    .click();
  const sheet = await readFile((await (await sheetPromise).path())!);
  expect(sheet.readUInt32BE(16)).toBe(1920);
  expect(sheet.readUInt32BE(20)).toBe(784);
});

test("animation keys, scrubbing, playback, fly mode and frame sequence export", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: /Движение 0/ }).click();
  await page.getByRole("button", { name: "Ключ в 0.0 с", exact: true }).click();
  const slider = page.getByLabel("Время анимации");
  await slider.fill("5");
  await page
    .getByRole("button", { name: "Редактировать этот момент", exact: true })
    .click();
  await page.getByLabel("X · м", { exact: true }).fill("6");
  await page.getByRole("button", { name: "Ключ в 5.0 с", exact: true }).click();
  await slider.fill("2.5");
  expect(
    Number(await page.getByLabel("X · м", { exact: true }).inputValue()),
  ).toBeCloseTo(3.5375, 2);
  await page
    .getByRole("button", { name: "Воспроизвести", exact: true })
    .click();
  await page.waitForTimeout(600);
  expect(Number(await slider.inputValue())).toBeGreaterThan(2.8);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  const paused = await slider.inputValue();
  await page.waitForTimeout(300);
  expect(await slider.inputValue()).toBe(paused);
  await page
    .getByRole("button", { name: "К исходной сцене", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Войти в камеру", exact: true })
    .click();
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyW");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Войти в камеру", exact: true }),
  ).toBeVisible();
  await waitSave(page);
  expect((await saved(page)).animation.keys).toHaveLength(2);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  await page.locator(".export-dropdown select").first().selectOption("800");
  await page.getByLabel("Частота экспорта").selectOption("6");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Движение · PNG в ZIP", exact: true })
    .click();
  const zip = await readFile((await (await dl).path())!);
  expect(zip.length).toBeGreaterThan(100000);
});

test("gizmo drag is one undo step; camera from view and storyboard playback", async ({
  page,
}) => {
  await start(page);
  await page.locator(".entity").filter({ hasText: "Алексей" }).click();
  await page.getByRole("button", { name: "Спереди", exact: true }).click();
  const before = await saved(page);
  const box = (await page.locator(".editor-canvas canvas").boundingBox())!;
  // Project the selected object's origin for the known front view, then use the X gizmo.
  const { PerspectiveCamera, Vector3 } = await import("three");
  const editor = new PerspectiveCamera(45, box.width / box.height, 0.025, 200);
  editor.position.set(0, 2, 10);
  editor.lookAt(0, 1, 0);
  editor.updateMatrixWorld();
  const origin = new Vector3(...before.scene.objects[0].position).project(
    editor,
  );
  const x = box.x + ((origin.x + 1) * box.width) / 2 + 65,
    y = box.y + ((1 - origin.y) * box.height) / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 45, y, { steps: 15 });
  await page.mouse.up();
  await waitSave(page);
  const moved = await saved(page);
  expect(moved.scene.objects[0].position[0]).toBeGreaterThan(
    before.scene.objects[0].position[0] + 0.2,
  );
  expect(moved.scene.cameras).toEqual(before.scene.cameras);
  await page
    .getByRole("button", { name: "Отменить · Ctrl Z", exact: true })
    .click();
  await expect(page.getByLabel("X · м", { exact: true })).toHaveValue("-1");
  await page
    .getByRole("button", { name: "Повторить · Ctrl Shift Z", exact: true })
    .click();
  await expect(page.getByLabel("X · м", { exact: true })).toHaveValue(
    String(Number(moved.scene.objects[0].position[0].toFixed(3))),
  );
  await page
    .getByRole("button", { name: "Камера из текущего вида", exact: true })
    .click();
  await expect(page.getByLabel("Название объекта")).toHaveValue(
    "Из обзора сцены",
  );
  await expect(page.getByLabel("Наведение", { exact: true })).toHaveValue(
    "manual",
  );
  await waitSave(page);
  expect((await saved(page)).scene.cameras).toHaveLength(6);
  await page.locator(".frame-card").first().click();
  await page.getByLabel("Секунды", { exact: true }).fill("0.3");
  await page.getByRole("button", { name: "Смотреть", exact: true }).click();
  await expect(page.locator(".frame-card").nth(1)).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
});

test("unavailable WebGL and storage produce readable errors without blocking JSON backup", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (
        type === "webgl2" ||
        type === "webgl" ||
        type === "experimental-webgl"
      )
        return null;
      return getContext.apply(this, [type, ...args] as any);
    } as any;
    IDBFactory.prototype.open = function () {
      throw new DOMException("Storage disabled", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await expect(
    page.getByText("WebGL 2 недоступен.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".save-state")).toContainText(
    "Не удалось сохранить",
  );
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Проект · JSON (резервная копия)",
      exact: true,
    })
    .click();
  const data = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(data.version).toBe(1);
  expect(data.scene.objects).toHaveLength(6);
});

test("preview keeps exact frame proportions in normal and expanded panels", async ({
  page,
}) => {
  await start(page);
  for (const expanded of [false, true]) {
    if (expanded)
      await page
        .getByRole("button", { name: "Увеличить предпросмотр", exact: true })
        .click();
    for (const [format, ratio] of [
      ["16:9", 16 / 9],
      ["9:16", 9 / 16],
      ["1:1", 1],
    ] as const) {
      await page
        .getByLabel("Формат кадра", { exact: true })
        .selectOption(format);
      await expect
        .poll(async () => {
          const b = (await page.locator(".camera-image").boundingBox())!;
          return Math.abs(b.width / b.height - ratio);
        })
        .toBeLessThan(0.002);
      const b = (await page.locator(".camera-image").boundingBox())!,
        parent = (await page.locator(".camera-fit").boundingBox())!;
      expect(b.width).toBeLessThanOrEqual(parent.width + 1);
      expect(b.height).toBeLessThanOrEqual(parent.height + 1);
    }
  }
});
