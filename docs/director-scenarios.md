# Четыре проверяемых сценария пульта режиссёра

Откройте «Пульт режиссёра» и выберите ситуацию. Примеры ниже получены теми же функциями, что используются в интерфейсе. Выбор ситуации применяет стартовый набор; дальнейшие параметры независимы. Проверки: `src/director/director.test.ts` и `tests/director.spec.ts`.

## Селфи на телефон

| Настройка | Выбор |
| --- | --- |
| Камера | Фронтальная камера телефона |
| Эпоха | Наше время |
| Оператор | Герой держит телефон |
| Угол обзора | Видно героя и окружение |
| Резкость | Камера сама ищет резкость |
| Цвет | Естественные цвета |
| Фактура | Чистое цифровое изображение |
| Ракурс | Со стороны лица, одна камера |

Подсказки:

- **Рекомендуется:** Поддерживает замысел «Селфи на телефон» и выбранный способ записи.
- Лицо близко к камере, кадр следует за рукой героя.
- Широкий угол оставляет место для пространства; лицо близко к краям может искажаться.
- Краткое мягкое уточнение резкости при изменении расстояния — выбранный приём, не обязательный дефект камеры.
- Нейтральная кожа и цвета без выраженной обработки.
- Без добавленного зерна или кассетных помех.

Настройки согласованы.

```text
STYLE: a personal selfie video. Contemporary production. natural skin tones and restrained straight-out-of-camera color; clean digital detail, no added grain or tape artifacts.
CAMERA: a contemporary phone front-facing camera; arm's-length self-recording, small wrist-driven framing changes; wide field of view, visible surroundings and mild perspective exaggeration at close range; autofocus with a brief gentle settling when subject distance changes; front-facing view of the subject.
```

## Друг снимает скетч

| Настройка | Выбор |
| --- | --- |
| Камера | Задняя камера телефона |
| Эпоха | Наше время |
| Оператор | Друг снимает скетч |
| Угол обзора | Естественные пропорции |
| Резкость | Камера сама ищет резкость |
| Цвет | Естественные цвета |
| Фактура | Чистое цифровое изображение |
| Ракурс | Со стороны лица, одна камера |

Подсказки:

- **Рекомендуется:** Поддерживает замысел «Друг снимает скетч» и выбранный способ записи.
- Оператор слегка запаздывает с реакцией и поправляет композицию.
- Умеренный угол: герой и пространство сбалансированы.
- Краткое мягкое уточнение резкости при изменении расстояния — выбранный приём, не обязательный дефект камеры.
- Нейтральная кожа и цвета без выраженной обработки.
- Без добавленного зерна или кассетных помех.

Настройки согласованы.

```text
STYLE: a casually recorded sketch filmed by a friend. Contemporary production. natural skin tones and restrained straight-out-of-camera color; clean digital detail, no added grain or tape artifacts.
CAMERA: a contemporary phone rear-facing camera; a friend filming handheld, slightly delayed reframing after reactions; moderate field of view, balanced subject-to-environment framing; autofocus with a brief gentle settling when subject distance changes; front-facing view of the subject.
```

## Офисный псевдодокументальный ситком

| Настройка | Выбор |
| --- | --- |
| Камера | Цифровая видеокамера с зумом |
| Эпоха | Наше время |
| Оператор | Наблюдатель в офисе |
| Угол обзора | Приблизить реакцию |
| Резкость | Герой и фон читаются |
| Цвет | Естественные цвета |
| Фактура | Чистое цифровое изображение |
| Ракурс | Со стороны лица, одна камера |

Подсказки:

- **Рекомендуется:** Поддерживает замысел «Офисный псевдодокументальный ситком» и выбранный способ записи.
- Камера замечает реакцию и поправляет кадр коротким приближением.
- Короткое приближение выделяет реакцию; нужен зум или осознанная имитация.
- Сохраняем детали окружения, без сильного размытия.
- Нейтральная кожа и цвета без выраженной обработки.
- Без добавленного зерна или кассетных помех.

Настройки согласованы.

```text
STYLE: an office mockumentary sitcom. Contemporary production. natural skin tones and restrained straight-out-of-camera color; clean digital detail, no added grain or tape artifacts.
CAMERA: a digital video camera with a zoom lens; observational handheld coverage with subtle natural sway; a short reactive zoom-in to isolate a reaction; deep focus, subject and surroundings remain readable; front-facing view of the subject.
```

## Домашнее видео эпохи

| Настройка | Выбор |
| --- | --- |
| Камера | Бытовая VHS-видеокамера |
| Эпоха | 1980-е |
| Оператор | Семья снимает на память |
| Угол обзора | Естественные пропорции |
| Резкость | Герой и фон читаются |
| Цвет | Бытовое кассетное видео |
| Фактура | Аналоговая видеокассета |
| Ракурс | Со стороны лица, одна камера |

Подсказки:

- **Рекомендуется:** Поддерживает замысел «Домашнее видео эпохи» и выбранный способ записи.
- Неточная композиция и медленные поправки выглядят любительскими.
- Умеренный угол: герой и пространство сбалансированы.
- Сохраняем детали окружения, без сильного размытия.
- Мягче разделение цветов, чуть плывёт баланс белого.
- Мягкие детали, цветовые шлейфы и ощущение чересстрочного видео; без плёночного зерна.

Настройки согласованы.

```text
STYLE: an amateur family home video. 1980s shooting register. consumer analog-video color, soft chroma separation and slight white-balance drift; analog videotape texture, soft detail, mild chroma bleed and interlaced motion character.
CAMERA: a consumer VHS videotape camera; amateur family handheld recording, imperfect framing and slow corrections; moderate field of view, balanced subject-to-environment framing; deep focus, subject and surroundings remain readable; front-facing view of the subject.
```

## Уточнения и намеренная стилизация

Для селфи выберите «Со спины». Появится объяснение, почему обычное селфи не даёт этот ракурс, и кнопка «Добавить второй ракурс». В тексте появится отдельный задний телефон у второго оператора. Альтернатива — подтвердить постановочную вставку; текст не назовёт её непрерывным селфи. Для активной 3D-камеры, наведённой на персонажа со спины, пульт также показывает расхождение с текстом и предлагает учесть ракурс сцены. Боковой или неизвестный ракурс автоматически не угадывается.

Для домашнего видео 80-х выберите современный телефон, сохранив кассетную фактуру. Пульт попросит уточнить эпоху и обработку. После подтверждения он прямо напишет «Contemporary production deliberately styled as 1980s footage» и пояснит, что фактура добавлена обработкой. Любое изменение выбора сбрасывает подтверждение.
