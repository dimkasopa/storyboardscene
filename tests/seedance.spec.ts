import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
import { readFileSync } from "node:fs";
const legacy = JSON.parse(
  readFileSync(new URL("./fixtures/project-v1.json", import.meta.url), "utf8"),
);
import { fitImage, SHEET } from "../src/storyboard";
const save = async (page: Page) =>
  page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("director-studio", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (store: string, key: string) =>
      new Promise<any>((resolve, reject) => {
        const request = db.transaction(store).objectStore(store).get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const project = await read("projects", await read("settings", "last"));
    db.close();
    return project;
  });
async function openFixture(page: Page, project = structuredClone(legacy)) {
  await page.goto("/");
  await expect(page.getByLabel("Название проекта")).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "legacy-v1.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await expect(page.locator(".toast")).toContainText("Проект импортирован");
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await expect(page.getByLabel("Название проекта")).toHaveValue(project.name);
  await expect(page.locator(".frame-image img")).toHaveCount(
    project.frames.length,
  );
  await expect.poll(async () => (await save(page))?.name).toBe(project.name);
}
async function exportedPNG(page: Page, name = "Текущий вид камеры · PNG") {
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const bytes = await readFile((await (await event).path())!);
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  return bytes;
}
async function imageDelta(
  page: Page,
  a: Uint8Array,
  b: Uint8Array,
  box?: { x: number; y: number; width: number; height: number },
) {
  return page.evaluate(
    async ({ a, b, box }) => {
      const load = async (src: string) => {
        const image = new Image();
        image.src = "data:image/png;base64," + src;
        await image.decode();
        return image;
      };
      const [first, second] = await Promise.all([load(a), load(b)]);
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = Math.round((160 * first.height) / first.width);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(first, 0, 0, canvas.width, canvas.height);
      const before = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (box)
        ctx.drawImage(
          second,
          box.x,
          box.y,
          box.width,
          box.height,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      else ctx.drawImage(second, 0, 0, canvas.width, canvas.height);
      const after = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let delta = 0;
      for (let i = 0; i < before.length; i += 4)
        delta +=
          Math.abs(before[i] - after[i]) +
          Math.abs(before[i + 1] - after[i + 1]) +
          Math.abs(before[i + 2] - after[i + 2]);
      return delta / (canvas.width * canvas.height * 3);
    },
    {
      a: Buffer.from(a).toString("base64"),
      b: Buffer.from(b).toString("base64"),
      box,
    },
  );
}

test("Seedance ZIP uses each saved camera, mixed formats, matching text and numbered pages", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.stack ?? e.message));
  const p: any = structuredClone(legacy);
  p.name = "Seedance · смешанные планы";
  const base = structuredClone(p.frames[0]);
  p.frames = Array.from({ length: 7 }, (_, i) => {
    const f = structuredClone(base);
    f.id = "shot-" + i;
    f.name = "План " + (i + 1);
    f.duration = i === 0 ? 2 : i === 1 ? 3 : 0.5;
    f.notes = i === 0 ? "Ты уже видел отчёт?" : "";
    const c = f.scene.cameras.find((c: any) => c.id === f.scene.activeCameraId);
    c.format = i % 2 ? "9:16" : "16:9";
    f.scene.objects[0].appearance = "cap";
    f.scene.objects[0].tag = "А";
    f.scene.objects[1].appearance = "hair";
    f.scene.objects[1].tag = "Б";
    if (i === 0)
      Object.assign(f, {
        shotType: "medium",
        speakerId: f.scene.objects[0].id,
        action: "Поворачивается к коллеге",
        cameraMovement: "Плавный наезд",
        transition: "cut",
      });
    return f;
  });
  // The current scene intentionally differs from every saved frame.
  p.scene.cameras.forEach((c: any) => (c.format = "1:1"));
  p.scene.objects
    .filter((o: any) => o.kind === "person")
    .forEach((o: any) => (o.color = "#ffffff"));
  await openFixture(page, p);
  await expect(page.locator(".frame-card")).toHaveCount(7);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  await page.locator(".export-dropdown select").first().selectOption("800");
  await expect(
    page.getByLabel("Имена и метки в подписях листа"),
  ).not.toBeChecked();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Экспорт для Seedance", exact: true })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toContain("-Seedance.zip");
  const files = unzipSync(await readFile((await download.path())!));
  const data = JSON.parse(strFromU8(files["shot-list.json"])),
    text = strFromU8(files["shot-list.txt"]);
  expect(data.project.version).toBe(1);
  expect(data.shots.map((s: any) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(data.shots[0].timecode).toBe("00:00–00:02");
  expect(data.shots[1].timecode).toBe("00:02–00:05");
  expect(data.shots[2].timecode).toBe("00:05–00:05.5");
  expect(data.shots[0].speaker.tag).toBe("А");
  expect(text).toContain("Говорящий персонаж: А · Алексей");
  expect(text).toContain("Действие / реакция: Поворачивается к коллеге");
  expect(text).toContain("Переход к следующему кадру: Склейка");
  expect(data.shots[1].action).toBe("");
  expect(data.shots[1].speaker).toBeNull();
  expect(data.shots[1].transition).toBe("");
  expect(text).toContain("Действие / реакция: не задано");
  expect([...text.matchAll(/^(\d{2}) · /gm)].map((m) => Number(m[1]))).toEqual([
    1, 2, 3, 4, 5, 6, 7,
  ]);
  for (const [i, shot] of data.shots.entries()) {
    const png = Buffer.from(files[shot.filename]);
    expect(png.length).toBeGreaterThan(15000);
    expect(png.readUInt32BE(16)).toBe(i % 2 ? 450 : 800);
    expect(png.readUInt32BE(20)).toBe(i % 2 ? 800 : 450);
    expect(text).toContain("PNG: " + shot.filename);
    if (i < 2) {
      const box = {
        ...SHEET.image,
        x: SHEET.image.x + i * SHEET.cellWidth,
        y: SHEET.header + SHEET.image.y,
      };
      const fit = fitImage(png.readUInt32BE(16), png.readUInt32BE(20), box);
      expect(
        await imageDelta(page, png, files["storyboard-01.png"], fit),
      ).toBeLessThan(4);
    }
  }
  const first = Buffer.from(files["storyboard-01.png"]),
    second = Buffer.from(files["storyboard-02.png"]);
  expect(first.readUInt32BE(16)).toBe(1920);
  expect(first.readUInt32BE(20)).toBe(1424);
  expect(second.readUInt32BE(20)).toBe(784);
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await expect(page.locator(".export-dropdown")).toHaveCount(0);
  // Compare the saved portrait shot to a separately exported PNG of that restored shot.
  await page.locator(".frame-card").nth(1).click();
  const portrait = await exportedPNG(page);
  expect(
    await imageDelta(page, files[data.shots[1].filename], portrait),
  ).toBeLessThan(0.1);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/seedance-editor.png",
    fullPage: true,
  });
});

test("old projects, appearance and new props persist; editor helpers stay out of PNG", async ({
  page,
}) => {
  await openFixture(page);
  await page.locator(".entity").filter({ hasText: "Алексей" }).click();
  await expect(page.getByLabel("Внешний вид персонажа")).toHaveValue("base");
  await page.getByLabel("Внешний вид персонажа").selectOption("glasses");
  await page.getByLabel("Метка персонажа").fill("М1");
  await page.getByLabel("Поза персонажа", { exact: true }).selectOption("sit");
  await page.getByLabel("Поворот головы · °").fill("35");
  await page.getByLabel("Поворот корпуса · °").fill("-30");
  for (const name of ["Кружка", "Рабочий стол", "Перегородка", "Кружка"]) {
    await page
      .getByRole("button", { name: "Добавить объект", exact: true })
      .click();
    await page.getByRole("button", { name, exact: true }).click();
  }
  await expect(page.getByLabel("Название объекта")).toHaveValue("Кружка 2");
  await page
    .getByRole("button", { name: "Сохранить проект", exact: true })
    .click();
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  const stored = await save(page);
  const actor = stored.scene.objects.find((o: any) => o.name === "Алексей");
  expect(actor.color).toBe(legacy.scene.objects[0].color);
  expect(actor.appearance).toBe("glasses");
  expect(actor.pose).toBe("sit");
  expect(actor.rotation).toBe(-30);
  expect(actor.head).toBe(35);
  expect(stored.scene.objects.filter((o: any) => o.prop)).toHaveLength(4);
  await page.reload();
  await page.locator(".entity").filter({ hasText: "Алексей" }).click();
  await expect(page.getByLabel("Метка персонажа")).toHaveValue("М1");
  await expect(page.getByLabel("Внешний вид персонажа")).toHaveValue("glasses");
  const before = await exportedPNG(page);
  await page.getByRole("button", { name: "Вид", exact: true }).click();
  for (const label of [
    "Сетка",
    "Имена персонажей",
    "Подписи камер",
    "Линии обзора камер",
  ])
    await page.getByRole("checkbox", { name: label, exact: true }).uncheck();
  await expect(page.locator(".editor-canvas .camera-label")).toHaveCount(0);
  await expect(page.locator(".editor-canvas .object-label")).toHaveCount(0);
  await expect(
    page.locator(".camera-image .camera-label,.camera-image .object-label"),
  ).toHaveCount(0);
  const after = await exportedPNG(page);
  expect(await imageDelta(page, before, after)).toBeLessThan(0.1);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const jsonEvent = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Проект · JSON (резервная копия)",
      exact: true,
    })
    .click();
  const file = await jsonEvent;
  const json = JSON.parse(await readFile((await file.path())!, "utf8"));
  expect(json.scene.objects.filter((o: any) => o.prop)).toHaveLength(4);
  await page.locator("input[type=file]").setInputFiles((await file.path())!);
  await expect(page.locator(".toast")).toContainText("Проект импортирован");
  await expect.poll(async () => (await save(page))?.id).not.toBe(json.id);
  expect((await save(page)).scene.objects).toEqual(json.scene.objects);
});

test("frame metadata is editable and export menu closes without covering the inspector", async ({
  page,
}) => {
  await openFixture(page);
  await page.locator(".frame-card").first().click();
  await page.locator(".frame-info summary").click();
  await page.getByLabel("Тип плана кадра").selectOption("shoulder");
  await page
    .getByLabel("Говорящий персонаж")
    .selectOption(legacy.scene.objects[1].id);
  await page.getByLabel("Действие или реакция").fill("Пауза и взгляд");
  await page.getByLabel("Движение камеры кадра").fill("Лёгкая ручная камера");
  await page.getByLabel("Переход к следующему кадру").selectOption("other");
  await page.getByLabel("Описание перехода").fill("Пауза перед склейкой");
  await page
    .getByRole("button", { name: "Сохранить проект", exact: true })
    .click();
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  const frame = (await save(page)).frames[0];
  expect(frame.shotType).toBe("shoulder");
  expect(frame.action).toBe("Пауза и взгляд");
  expect(frame.transitionNotes).toBe("Пауза перед склейкой");
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  await expect(page.locator(".export-dropdown")).toBeVisible();
  const menu = (await page.locator(".export-dropdown").boundingBox())!,
    inspector = (await page.locator(".inspector").boundingBox())!;
  expect(menu.x + menu.width).toBeLessThanOrEqual(inspector.x);
  await page.keyboard.press("Escape");
  await expect(page.locator(".export-dropdown")).toHaveCount(0);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  await page.locator(".panel-title").last().click();
  await expect(page.locator(".export-dropdown")).toHaveCount(0);
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  await page
    .getByRole("button", { name: "Закрыть меню экспорта", exact: true })
    .click();
  await expect(page.locator(".export-dropdown")).toHaveCount(0);
});
