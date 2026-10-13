import { defaultDirector, type DirectorSettings } from "./settings";
export type Choice = {
  id: string;
  label: string;
  effect: string;
  prompt: string;
};
export const controls = {
  operator: [
    {
      id: "casual",
      label: "Живой момент с рук",
      effect:
        "Небольшой дрейф кадра и мягкая дрожь создают ощущение присутствия.",
      prompt:
        "casual handheld observation, subtle natural hand tremor and slight framing drift",
    },
    {
      id: "selfie",
      label: "Герой держит телефон",
      effect: "Лицо близко к камере, кадр следует за рукой героя.",
      prompt: "arm's-length self-recording, small wrist-driven framing changes",
    },
    {
      id: "friend",
      label: "Друг снимает скетч",
      effect: "Оператор слегка запаздывает с реакцией и поправляет композицию.",
      prompt:
        "a friend filming handheld, slightly delayed reframing after reactions",
    },
    {
      id: "observer",
      label: "Наблюдатель в офисе",
      effect:
        "Камера замечает реакцию и поправляет кадр коротким приближением.",
      prompt:
        "observational handheld coverage, a brief reactive reframing toward a reaction",
    },
    {
      id: "home",
      label: "Семья снимает на память",
      effect:
        "Неточная композиция и медленные поправки выглядят любительскими.",
      prompt:
        "amateur family handheld recording, imperfect framing and slow corrections",
    },
    {
      id: "locked",
      label: "Камера неподвижна",
      effect: "Ракурс устойчив: внимание остаётся на действии в кадре.",
      prompt: "locked-off camera, no camera movement",
    },
    {
      id: "controlled",
      label: "Плавное сопровождение",
      effect: "Оператор аккуратно сопровождает героя одним плавным движением.",
      prompt: "controlled smooth lateral tracking following the subject",
    },
  ],
  optics: [
    {
      id: "wide",
      label: "Видно героя и окружение",
      effect:
        "Широкий угол оставляет место для пространства; лицо близко к краям может искажаться.",
      prompt:
        "wide field of view, visible surroundings and mild perspective exaggeration at close range",
    },
    {
      id: "normal",
      label: "Естественные пропорции",
      effect: "Умеренный угол: герой и пространство сбалансированы.",
      prompt: "moderate field of view, balanced subject-to-environment framing",
    },
    {
      id: "zoom",
      label: "Приблизить реакцию",
      effect:
        "Короткое приближение выделяет реакцию; нужен зум или осознанная имитация.",
      prompt: "a short reactive zoom-in to isolate a reaction",
    },
    {
      id: "portrait",
      label: "Лицо крупнее, фон теснее",
      effect: "Узкий угол выделяет лицо и уменьшает видимую часть окружения.",
      prompt:
        "narrow field of view, compressed background framing for a portrait",
    },
  ],
  focus: [
    {
      id: "deep",
      label: "Герой и фон читаются",
      effect: "Сохраняем детали окружения, без сильного размытия.",
      prompt: "deep focus, subject and surroundings remain readable",
    },
    {
      id: "auto",
      label: "Камера сама ищет резкость",
      effect:
        "Краткое мягкое уточнение резкости при изменении расстояния — выбранный приём, не обязательный дефект камеры.",
      prompt:
        "autofocus with a brief gentle settling when subject distance changes",
    },
    {
      id: "manual",
      label: "Резкость заранее выставлена",
      effect:
        "Резкость остаётся на выбранной дистанции; герой может выйти из неё.",
      prompt: "manually set focus held at the subject's starting distance",
    },
    {
      id: "shallow",
      label: "Резкий герой, мягкий фон",
      effect:
        "Малая глубина резкости отделяет героя; на телефоне это может быть вычислительная имитация.",
      prompt:
        "shallow depth of field, a sharp subject against a softly blurred background",
    },
  ],
  color: [
    {
      id: "natural",
      label: "Естественные цвета",
      effect: "Нейтральная кожа и цвета без выраженной обработки.",
      prompt: "natural skin tones and restrained straight-out-of-camera color",
    },
    {
      id: "video",
      label: "Бытовое кассетное видео",
      effect: "Мягче разделение цветов, чуть плывёт баланс белого.",
      prompt:
        "consumer analog-video color, soft chroma separation and slight white-balance drift",
    },
    {
      id: "warm-film",
      label: "Тёплая плёночная палитра",
      effect:
        "Тёплая палитра — художественная обработка, а не свойство любой плёнки.",
      prompt: "a warm film-inspired palette with restrained saturation",
    },
    {
      id: "graded",
      label: "Аккуратно обработанные цвета",
      effect: "Тона намеренно выровнены и согласованы между кадрами.",
      prompt: "deliberately balanced color grading with consistent skin tones",
    },
  ],
  texture: [
    {
      id: "clean",
      label: "Чистое цифровое изображение",
      effect: "Без добавленного зерна или кассетных помех.",
      prompt: "clean digital detail, no added grain or tape artifacts",
    },
    {
      id: "tape",
      label: "Аналоговая видеокассета",
      effect:
        "Мягкие детали, цветовые шлейфы и ощущение чересстрочного видео; без плёночного зерна.",
      prompt:
        "analog videotape texture, soft detail, mild chroma bleed and interlaced motion character",
    },
    {
      id: "dv",
      label: "Раннее цифровое видео",
      effect:
        "Более чёткие края и сдержанные следы цифрового сжатия; это не VHS.",
      prompt:
        "early digital DV-video texture, defined edges and restrained compression artifacts",
    },
    {
      id: "grain",
      label: "Зерно киноплёнки",
      effect: "Мелкое нерегулярное зерно, без помех аналоговой видеоленты.",
      prompt:
        "fine irregular photochemical film grain, no analog videotape artifacts",
    },
  ],
} satisfies Record<string, Choice[]>;
export type ControlKey = keyof typeof controls;
export const eras = [
  { id: "present", label: "Наше время" },
  { id: "1960s", label: "1960–70-е" },
  { id: "1980s", label: "1980-е" },
  { id: "1990s", label: "1990-е" },
  { id: "2000s", label: "2000-е" },
] as const;
export const eraPrompt = {
  present: "contemporary",
  "1960s": "1960s–1970s",
  "1980s": "1980s",
  "1990s": "1990s",
  "2000s": "2000s",
};
export type CameraChoice = {
  id: DirectorSettings["camera"];
  name: string;
  period: string;
  medium: string;
  features: string;
  tasks: string;
  prompt: string;
  family: "phone" | "film" | "tape" | "dv" | "digital";
  eras: DirectorSettings["era"][];
  sources: { name: string; url: string }[];
};
const psap = (anchor: string) => ({
  name: "University of Illinois · PSAP",
  url: `https://psap.library.illinois.edu/collection-id-guide/${anchor}`,
});
const android = {
  name: "Android · Camera samples",
  url: "https://github.com/android/camera-samples",
};
const ffmpeg = {
  name: "FFmpeg · Formats / codecs",
  url: "https://github.com/FFmpeg/FFmpeg/blob/master/doc/general_contents.texi",
};
export const cameras: CameraChoice[] = [
  {
    id: "phone-front",
    name: "Фронтальная камера телефона",
    period: "Современный телефон · 2010–2020-е",
    medium: "Цифровой видеофайл в памяти телефона",
    features:
      "Камера смотрит на снимающего; угол, стабилизация и фокус зависят от устройства. Дрожь не обязательна.",
    tasks: "Селфи, обращение к зрителю, личный видеодневник",
    prompt: "a contemporary phone front-facing camera",
    family: "phone",
    eras: ["present"],
    sources: [android],
  },
  {
    id: "phone-rear",
    name: "Задняя камера телефона",
    period: "Современный телефон · 2010–2020-е",
    medium: "Цифровой видеофайл в памяти телефона",
    features:
      "Снимает пространство перед оператором; можно выбрать широкий угол. Набор объективов зависит от телефона.",
    tasks: "Живой момент, скетч друга, прогулка",
    prompt: "a contemporary phone rear-facing camera",
    family: "phone",
    eras: ["present"],
    sources: [android],
  },
  {
    id: "super8",
    name: "Любительская камера Super 8",
    period: "С середины 1960-х · используется и сегодня",
    medium: "8-мм киноплёнка в картридже; проявка и сканирование",
    features:
      "Фотохимическое зерно; вид зависит от плёнки, экспозиции и сканирования. Звук не предполагается автоматически.",
    tasks: "Семейная хроника, плёночный дневник, ретростилизация",
    prompt: "a Super 8 home-movie film camera",
    family: "film",
    eras: ["1960s", "1980s", "1990s", "2000s", "present"],
    sources: [psap("film#filmsuper8")],
  },
  {
    id: "vhs",
    name: "Бытовая VHS-видеокамера",
    period: "1980–1990-е",
    medium: "Аналоговое видео на VHS-кассете",
    features:
      "Невысокая детализация и мягкий цвет; чересстрочный сигнал. Помехи зависят от состояния ленты и копирования.",
    tasks: "Семейный праздник, домашнее видео 80-х",
    prompt: "a consumer VHS videotape camera",
    family: "tape",
    eras: ["1980s", "1990s", "2000s", "present"],
    sources: [psap("videotape#vhs")],
  },
  {
    id: "video8",
    name: "Компактная Video8-видеокамера",
    period: "С середины 1980-х · 1980–1990-е",
    medium: "Аналоговое видео на 8-мм магнитной ленте",
    features:
      "Это видеолента, а не 8-мм киноплёнка. Мягкие детали и цвет аналогового домашнего видео.",
    tasks: "Поездка, любительская хроника, домашнее видео 90-х",
    prompt: "a consumer Video8 analog camcorder",
    family: "tape",
    eras: ["1980s", "1990s", "2000s", "present"],
    sources: [psap("videotape#video8")],
  },
  {
    id: "minidv",
    name: "Цифровая MiniDV-видеокамера",
    period: "С середины 1990-х · 1990–2000-е",
    medium: "Цифровая DV-запись на MiniDV-кассете",
    features:
      "Цифровое видео на ленте, а не VHS; стандартные DV-варианты могут быть чересстрочными. Параметры зависят от системы записи.",
    tasks: "Домашнее видео 2000-х, ранний цифровой дневник",
    prompt: "a MiniDV digital tape camcorder",
    family: "dv",
    eras: ["1990s", "2000s", "present"],
    sources: [psap("videotape#minidv"), ffmpeg],
  },
  {
    id: "digital-zoom",
    name: "Цифровая видеокамера с зумом",
    period: "2000-е — настоящее время · тип оборудования",
    medium: "Цифровой видеофайл; носитель и кодек зависят от модели",
    features:
      "Управляемое изменение угла обзора. Цвет, глубина резкости и способ фокусировки задаются отдельно.",
    tasks: "Офисный псевдодокументальный ситком, наблюдение, репортаж",
    prompt: "a digital video camera with a zoom lens",
    family: "digital",
    eras: ["2000s", "present"],
    sources: [android, ffmpeg],
  },
  {
    id: "cinema",
    name: "Цифровая кинокамера",
    period: "Современная профессиональная съёмка · тип оборудования",
    medium: "Цифровой видеофайл; формат записи зависит от модели",
    features:
      "Позволяет строить управляемый съёмочный процесс. Само название не задаёт свет, движение, объектив или цвет.",
    tasks: "Постановочная сцена, реклама, контролируемая съёмка",
    prompt: "a professional digital cinema camera",
    family: "digital",
    eras: ["present"],
    sources: [ffmpeg],
  },
];
export const situations: {
  id: DirectorSettings["situation"];
  label: string;
  description: string;
  prompt: string;
  recommended: DirectorSettings["camera"][];
  suitable: DirectorSettings["camera"][];
  defaults: Partial<DirectorSettings>;
}[] = [
  {
    id: "live",
    label: "Живой момент на телефон",
    description: "Будто вы достали телефон и сняли происходящее.",
    prompt: "spontaneous phone footage",
    recommended: ["phone-rear"],
    suitable: ["phone-front"],
    defaults: { camera: "phone-rear", operator: "casual" },
  },
  {
    id: "selfie",
    label: "Селфи на телефон",
    description: "Герой снимает себя и обращается к зрителю.",
    prompt: "a personal selfie video",
    recommended: ["phone-front"],
    suitable: ["phone-rear"],
    defaults: { camera: "phone-front", operator: "selfie" },
  },
  {
    id: "friend",
    label: "Друг снимает скетч",
    description: "Друг реагирует на действие, оставаясь за камерой.",
    prompt: "a casually recorded sketch filmed by a friend",
    recommended: ["phone-rear"],
    suitable: ["digital-zoom", "minidv"],
    defaults: { camera: "phone-rear", operator: "friend", optics: "normal" },
  },
  {
    id: "office",
    label: "Офисный псевдодокументальный ситком",
    description: "Наблюдающая камера ловит неловкие реакции коллег.",
    prompt: "an office mockumentary sitcom",
    recommended: ["digital-zoom"],
    suitable: ["phone-rear", "cinema"],
    defaults: {
      camera: "digital-zoom",
      operator: "observer",
      optics: "zoom",
      focus: "deep",
    },
  },
  {
    id: "home",
    label: "Домашнее видео эпохи",
    description: "Семья снимает на память; выберите эпоху и способ записи.",
    prompt: "an amateur family home video",
    recommended: ["vhs", "video8", "super8", "minidv"],
    suitable: ["phone-rear"],
    defaults: {
      era: "1980s",
      camera: "vhs",
      operator: "home",
      optics: "normal",
      focus: "deep",
      color: "video",
      texture: "tape",
    },
  },
  {
    id: "professional",
    label: "Профессиональная съёмка",
    description: "Продуманный ракурс, поведение камеры и обработка.",
    prompt: "a deliberately staged professional production",
    recommended: ["cinema"],
    suitable: ["digital-zoom", "super8", "phone-rear"],
    defaults: {
      camera: "cinema",
      operator: "controlled",
      optics: "normal",
      focus: "manual",
      color: "graded",
    },
  },
];
export function situationDefaults(
  id: DirectorSettings["situation"],
): DirectorSettings {
  return {
    ...defaultDirector,
    ...situations.find((s) => s.id === id)!.defaults,
    situation: id,
  };
}
