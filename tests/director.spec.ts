import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
const legacy = JSON.parse(
  readFileSync(new URL("./fixtures/project-v1.json", import.meta.url), "utf8"),
);
async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByLabel("Название проекта")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "v1.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacy)),
  });
  await expect(page.locator(".toast")).toContainText("Проект импортирован");
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Пульт режиссёра", exact: true })
    .click();
  return page.getByRole("dialog", { name: "Пульт режиссёра", exact: true });
}
async function exportJSON(page: Page) {
  await page.getByRole("button", { name: "Экспорт", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: "Проект · JSON (резервная копия)",
      exact: true,
    })
    .click();
  const file = await pending;
  return {
    path: (await file.path())!,
    data: JSON.parse(await readFile((await file.path())!, "utf8")),
  };
}

test("four shooting situations explain choices and produce STYLE/CAMERA in the browser", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const dialog = await open(page);
  const cases = [
    [
      "selfie",
      "Фронтальная камера телефона",
      "selfie",
      "arm's-length self-recording",
    ],
    [
      "friend",
      "Задняя камера телефона",
      "friend",
      "slightly delayed reframing",
    ],
    [
      "office",
      "Цифровая видеокамера с зумом",
      "observer",
      "short reactive zoom-in",
    ],
    ["home", "Бытовая VHS-видеокамера", "home", "1980s shooting register"],
  ];
  for (const [situation, camera, operator, phrase] of cases) {
    await dialog
      .getByLabel("Съёмочная ситуация", { exact: true })
      .selectOption(situation);
    await expect(
      dialog.getByLabel("Кто держит камеру и как", { exact: true }),
    ).toHaveValue(operator);
    await expect(
      dialog.getByRole("button", { name: `Выбрать: ${camera}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".director-camera.selected")).toContainText(
      "Рекомендуется",
    );
    await expect(
      dialog.getByLabel("STYLE/CAMERA", { exact: true }),
    ).toHaveValue(new RegExp(phrase));
    await expect(
      dialog.getByLabel("STYLE/CAMERA", { exact: true }),
    ).toHaveValue(/STYLE:[\s\S]+CAMERA:/);
    await expect(dialog.locator(".director-advice")).toContainText(
      "Настройки согласованы",
    );
    await expect(dialog.locator(".director-setting").first()).toContainText(
      situation === "selfie"
        ? "кадр следует за рукой"
        : situation === "friend"
          ? "запаздывает"
          : situation === "office"
            ? "замечает реакцию"
            : "любительскими",
    );
  }
  await expect(dialog.locator(".director-camera")).toHaveCount(8);
  await expect(dialog.locator(".director-camera").first()).toContainText(
    "Аналоговое видео на VHS-кассете",
  );
  await page.screenshot({ path: "test-results/director-home.png" });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Пульт режиссёра", exact: true }),
  ).toBeFocused();
  expect(errors).toEqual([]);
});

test("selfie conflict offers a second angle and deliberate styling resets on changes", async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog
    .getByLabel("Съёмочная ситуация", { exact: true })
    .selectOption("selfie");
  await dialog.getByLabel("Ракурс героя в промпте").selectOption("back");
  await expect(dialog.locator(".director-advice")).toContainText(
    "Требует уточнения",
  );
  await expect(dialog.getByLabel("STYLE/CAMERA", { exact: true })).toHaveValue(
    /\[Clarify:/,
  );
  await dialog
    .getByRole("button", { name: "Добавить второй ракурс", exact: true })
    .click();
  await expect(dialog.locator(".director-advice")).toContainText(
    "Настройки согласованы",
  );
  await expect(dialog.getByLabel("STYLE/CAMERA", { exact: true })).toHaveValue(
    /separate rear-phone camera held by a second operator/,
  );
  await dialog
    .getByLabel("Эпоха изображения", { exact: true })
    .selectOption("1980s");
  await dialog
    .getByRole("checkbox", {
      name: "Подтверждаю намеренную стилизацию / постановочную вставку",
      exact: true,
    })
    .check();
  await expect(dialog.getByLabel("STYLE/CAMERA", { exact: true })).toHaveValue(
    /Contemporary production deliberately styled as 1980s footage/,
  );
  await dialog
    .getByLabel("Что попадает в кадр", { exact: true })
    .selectOption("portrait");
  await expect(
    dialog.getByRole("checkbox", {
      name: "Подтверждаю намеренную стилизацию / постановочную вставку",
      exact: true,
    }),
  ).not.toBeChecked();
  await expect(dialog.locator(".director-advice")).toContainText(
    "фронтальной камеры нельзя предполагать оптический зум",
  );
});

test("settings persist through reload and JSON import without changing old cameras or snapshots", async ({
  page,
}) => {
  const dialog = await open(page);
  await dialog
    .getByLabel("Съёмочная ситуация", { exact: true })
    .selectOption("office");
  await dialog.getByLabel("Цвет", { exact: true }).selectOption("graded");
  const prompt = await dialog
    .getByLabel("STYLE/CAMERA", { exact: true })
    .inputValue();
  await dialog
    .getByRole("button", { name: "Закрыть пульт режиссёра", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Сохранить проект", exact: true })
    .click();
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button", { name: "Пульт режиссёра", exact: true })
    .click();
  await expect(page.getByLabel("STYLE/CAMERA", { exact: true })).toHaveValue(
    prompt,
  );
  await page
    .getByRole("button", { name: "Закрыть пульт режиссёра", exact: true })
    .click();
  const file = await exportJSON(page);
  expect(file.data.director).toMatchObject({
    version: 1,
    situation: "office",
    camera: "digital-zoom",
    color: "graded",
  });
  expect(file.data.scene.cameras).toEqual(legacy.scene.cameras);
  expect(file.data.frames.map((f: any) => f.scene.cameras)).toEqual(
    legacy.frames.map((f: any) => f.scene.cameras),
  );
  expect(file.data.animation.keys.map((k: any) => k.scene.cameras)).toEqual(
    legacy.animation.keys.map((k: any) => k.scene.cameras),
  );
  await page.locator("input[type=file]").setInputFiles(file.path);
  await expect(page.locator(".toast")).toContainText("Проект импортирован");
  await expect(page.locator(".busy-overlay")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Пульт режиссёра", exact: true })
    .click();
  await expect(page.getByLabel("STYLE/CAMERA", { exact: true })).toHaveValue(
    prompt,
  );
});
