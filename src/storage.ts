import { openDB } from "idb";
import { parseProject, type Project } from "./model";
const db = () =>
  openDB("director-studio", 1, {
    upgrade(db) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("settings");
    },
  });
export async function saveProject(p: Project) {
  const d = await db();
  const tx = d.transaction(["projects", "settings"], "readwrite");
  await tx.objectStore("projects").put(p);
  await tx.objectStore("settings").put(p.id, "last");
  await tx.done;
}
export async function listProjects(): Promise<Project[]> {
  return (await (await db()).getAll("projects")).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}
export async function loadLast(): Promise<Project | null> {
  const d = await db();
  const id = await d.get("settings", "last");
  const p = id ? await d.get("projects", id) : null;
  return p ? parseProject(JSON.stringify(p)) : null;
}
export async function deleteProject(id: string) {
  await (await db()).delete("projects", id);
}
