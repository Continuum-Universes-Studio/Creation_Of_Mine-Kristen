import { asc, eq, inArray } from "drizzle-orm";
import { db } from "./db.js";
import { storyPictures } from "./schema.js";

export type PictureGroup = { after: number; srcs: string[] };
export type PictureRow = { after: number; src: string };

export function cleanPictures(value: unknown): PictureRow[] {
  if (!Array.isArray(value)) return [];
  const rows: PictureRow[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as { after?: unknown; src?: unknown };
    const src = typeof record.src === "string" ? record.src.trim() : "";
    const after = Number(record.after ?? 0);
    if (!src || src.length > 300 || !Number.isInteger(after) || after < 0 || after > 80) continue;
    rows.push({ after, src });
  }
  return rows;
}

export function groupPictures(rows: { afterParagraph: number; src: string; sort: number }[]): PictureGroup[] {
  const groups: PictureGroup[] = [];
  for (const row of [...rows].sort((a, b) => a.sort - b.sort)) {
    const last = groups.at(-1);
    if (last && last.after === row.afterParagraph) last.srcs.push(row.src);
    else groups.push({ after: row.afterParagraph, srcs: [row.src] });
  }
  return groups;
}

export async function picturesFor(storyIds: number[]) {
  const grouped = new Map<number, PictureGroup[]>();
  if (!storyIds.length) return grouped;
  const rows = await db
    .select()
    .from(storyPictures)
    .where(inArray(storyPictures.storyId, storyIds))
    .orderBy(asc(storyPictures.sort));
  const byStory = new Map<number, typeof rows>();
  for (const row of rows) {
    const list = byStory.get(row.storyId) ?? [];
    list.push(row);
    byStory.set(row.storyId, list);
  }
  for (const [storyId, list] of byStory) grouped.set(storyId, groupPictures(list));
  return grouped;
}

export async function replacePictures(storyId: number, pictures: PictureRow[]) {
  await db.delete(storyPictures).where(eq(storyPictures.storyId, storyId));
  if (!pictures.length) return;
  await db.insert(storyPictures).values(
    pictures.map((picture, sort) => ({
      storyId,
      afterParagraph: picture.after,
      src: picture.src,
      sort,
    })),
  );
}
