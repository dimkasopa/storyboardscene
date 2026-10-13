export const appearances = [
  "base",
  "slim",
  "wide",
  "hair",
  "glasses",
  "cap",
] as const;
export type Appearance = (typeof appearances)[number];
export const appearanceLabels: Record<Appearance, string> = {
  base: "Базовый",
  slim: "Худощавый",
  wide: "Широкий",
  hair: "С причёской",
  glasses: "В очках",
  cap: "В кепке",
};
// New props remain variants of the original v1 kinds: older scenes need no migration.
export const propKinds = [
  "armchair",
  "smalltable",
  "reception",
  "shelf",
  "monitor",
  "desk",
  "mug",
  "phone",
  "papers",
  "box",
  "window",
  "partition",
] as const;
export type PropKind = (typeof propKinds)[number];
export const propLabels: Record<PropKind, string> = {
  armchair: "Кресло",
  smalltable: "Небольшой стол",
  reception: "Стойка / ресепшен",
  shelf: "Стеллаж",
  monitor: "Монитор",
  desk: "Рабочий стол",
  mug: "Кружка",
  phone: "Телефон",
  papers: "Папка / бумаги",
  box: "Коробка",
  window: "Окно",
  partition: "Перегородка",
};
export const propBaseKinds: Record<
  PropKind,
  "cube" | "table" | "sofa" | "wall"
> = {
  armchair: "sofa",
  smalltable: "table",
  reception: "table",
  shelf: "cube",
  monitor: "cube",
  desk: "table",
  mug: "cube",
  phone: "cube",
  papers: "cube",
  box: "cube",
  window: "cube",
  partition: "wall",
};
export const objectCategories = [
  { name: "Персонажи", items: [{ kind: "person", name: "Персонаж" }] },
  {
    name: "Мебель",
    items: [
      { kind: "chair", name: "Стул" },
      { kind: "armchair", name: "Кресло" },
      { kind: "sofa", name: "Диван" },
      { kind: "table", name: "Стол" },
      { kind: "smalltable", name: "Небольшой стол" },
      { kind: "desk", name: "Рабочий стол" },
      { kind: "reception", name: "Стойка / ресепшен" },
      { kind: "shelf", name: "Стеллаж" },
    ],
  },
  {
    name: "Реквизит",
    items: [
      { kind: "monitor", name: "Монитор" },
      { kind: "mug", name: "Кружка" },
      { kind: "phone", name: "Телефон" },
      { kind: "papers", name: "Папка / бумаги" },
      { kind: "box", name: "Коробка" },
      { kind: "cube", name: "Куб" },
    ],
  },
  {
    name: "Помещение",
    items: [
      { kind: "door", name: "Дверь" },
      { kind: "window", name: "Окно" },
      { kind: "wall", name: "Стена" },
      { kind: "partition", name: "Перегородка" },
    ],
  },
] as const;
