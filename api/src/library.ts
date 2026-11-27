import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { asc, count, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { db } from "./db.js";
import { books, galleryGroups, galleryPieces, sitePages } from "./schema.js";
import { slugify } from "./text.js";

const pageKeys = new Set(["books", "gallery", "about"]);

function bookJson(row: typeof books.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    shortTitle: row.shortTitle,
    badge: row.badge,
    shortBadge: row.shortBadge,
    body: row.body,
    cover: row.cover,
    coverAlt: row.coverAlt,
    carouselAlt: row.carouselAlt,
    coverStyle: row.coverStyle,
    primaryLabel: row.primaryLabel,
    primaryHref: row.primaryHref,
    secondaryLabel: row.secondaryLabel,
    secondaryHref: row.secondaryHref,
    shelf: row.shelf,
    inCarousel: row.inCarousel,
    sort: row.sort,
  };
}

type BookInput = {
  title?: string;
  shortTitle?: string;
  badge?: string;
  shortBadge?: string;
  body?: string;
  cover?: string;
  coverAlt?: string;
  carouselAlt?: string;
  coverStyle?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  shelf?: string;
  inCarousel?: boolean;
  sort?: number;
};

function bookValues(body: BookInput | null) {
  const title = body?.title?.trim() ?? "";
  const shelf = body?.shelf === "card" ? "card" : "block";
  const coverStyle = body?.coverStyle === "night" ? "night" : "";
  const sort = Number(body?.sort ?? 0);
  if (!title) return { error: "A book needs a title." } as const;
  if (!Number.isInteger(sort) || sort < 0 || sort > 999) return { error: "The order should be a small number." } as const;
  return {
    value: {
      title,
      shortTitle: body?.shortTitle?.trim() ?? "",
      badge: body?.badge?.trim() ?? "",
      shortBadge: body?.shortBadge?.trim() ?? "",
      body: body?.body?.trim() ?? "",
      cover: body?.cover?.trim() ?? "",
      coverAlt: body?.coverAlt?.trim() ?? "",
      carouselAlt: body?.carouselAlt?.trim() ?? "",
      coverStyle,
      primaryLabel: body?.primaryLabel?.trim() ?? "",
      primaryHref: body?.primaryHref?.trim() ?? "",
      secondaryLabel: body?.secondaryLabel?.trim() ?? "",
      secondaryHref: body?.secondaryHref?.trim() ?? "",
      shelf,
      inCarousel: body?.inCarousel !== false,
      sort,
    },
  } as const;
}

async function uniqueBookSlug(base: string) {
  let slug = base;
  let n = 2;
  while (true) {
    const [found] = await db.select({ id: books.id }).from(books).where(eq(books.slug, slug)).limit(1);
    if (!found) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

type PieceInput = { src?: string; alt?: string; caption?: string; tone?: string };

function cleanPieces(value: unknown) {
  if (!Array.isArray(value)) return [];
  const pieces: { src: string; alt: string; caption: string; tone: string }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as PieceInput;
    const src = record.src?.trim() ?? "";
    if (!src) continue;
    const tone = record.tone === "night" || record.tone === "framed" ? record.tone : "";
    pieces.push({
      src,
      alt: record.alt?.trim() ?? "",
      caption: record.caption?.trim() ?? "",
      tone,
    });
  }
  return pieces;
}

async function galleryPayload() {
  const groups = await db.select().from(galleryGroups).orderBy(asc(galleryGroups.sort), asc(galleryGroups.id));
  const pieces = await db.select().from(galleryPieces).orderBy(asc(galleryPieces.sort), asc(galleryPieces.id));
  return groups.map((group) => ({
    id: group.id,
    title: group.title,
    note: group.note,
    sort: group.sort,
    pieces: pieces
      .filter((piece) => piece.groupId === group.id)
      .map((piece) => ({
        id: piece.id,
        src: piece.src,
        alt: piece.alt,
        caption: piece.caption,
        tone: piece.tone,
        sort: piece.sort,
      })),
  }));
}

async function readPage(key: string) {
  const [row] = await db.select().from(sitePages).where(eq(sitePages.key, key)).limit(1);
  if (!row) return null;
  return JSON.parse(row.document) as unknown;
}

export function registerLibrary(app: Hono) {
  app.get("/books", async (c) => {
    const rows = await db.select().from(books).orderBy(asc(books.sort), asc(books.id));
    return c.json(rows.map(bookJson));
  });

  app.get("/gallery", async (c) => {
    const page = await readPage("gallery");
    return c.json({ page, groups: await galleryPayload() });
  });

  app.get("/pages/:key", async (c) => {
    const key = c.req.param("key");
    if (!pageKeys.has(key)) return c.json({ error: "That page is not here." }, 404);
    const document = await readPage(key);
    if (!document) return c.json({ error: "That page is not here." }, 404);
    return c.json(document);
  });

  app.get("/manage/books", async (c) => {
    const rows = await db.select().from(books).orderBy(asc(books.sort), asc(books.id));
    return c.json(rows.map(bookJson));
  });

  app.post("/manage/books", async (c) => {
    const parsed = bookValues(await c.req.json<BookInput>().catch(() => null));
    if ("error" in parsed) return c.json({ error: parsed.error }, 400);
    const slug = await uniqueBookSlug(slugify(parsed.value.title));
    const [row] = await db.insert(books).values({ ...parsed.value, slug }).returning();
    if (!row) return c.json({ error: "The book was not saved." }, 500);
    return c.json(bookJson(row), 201);
  });

  app.put("/manage/books/order", async (c) => {
    const body = await c.req.json<{ ids?: unknown }>().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is number => Number.isInteger(id)) : [];
    if (!ids.length) return c.json({ error: "Choose an order for the books." }, 400);
    for (const [sort, id] of ids.entries()) {
      await db.update(books).set({ sort }).where(eq(books.id, id));
    }
    return c.json({ ok: true });
  });

  app.put("/manage/books/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const parsed = bookValues(await c.req.json<BookInput>().catch(() => null));
    if (!Number.isInteger(id) || "error" in parsed) {
      return c.json({ error: "error" in parsed ? parsed.error : "That book is not here." }, 400);
    }
    const [row] = await db.update(books).set(parsed.value).where(eq(books.id, id)).returning();
    if (!row) return c.json({ error: "That book is not here." }, 404);
    return c.json(bookJson(row));
  });

  app.delete("/manage/books/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "That book is not here." }, 400);
    const [row] = await db.delete(books).where(eq(books.id, id)).returning({ id: books.id });
    if (!row) return c.json({ error: "That book is not here." }, 404);
    return c.json({ ok: true });
  });

  app.get("/manage/gallery", async (c) => {
    return c.json({ page: await readPage("gallery"), groups: await galleryPayload() });
  });

  app.put("/manage/gallery/groups/order", async (c) => {
    const body = await c.req.json<{ ids?: unknown }>().catch(() => null);
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is number => Number.isInteger(id)) : [];
    if (!ids.length) return c.json({ error: "Choose an order for the gallery." }, 400);
    for (const [sort, id] of ids.entries()) {
      await db.update(galleryGroups).set({ sort }).where(eq(galleryGroups.id, id));
    }
    return c.json({ ok: true });
  });

  app.post("/manage/gallery/groups", async (c) => {
    const body = await c.req.json<{ title?: string; note?: string; sort?: number; pieces?: unknown }>().catch(() => null);
    const title = body?.title?.trim() ?? "";
    if (!title) return c.json({ error: "A gallery group needs a title." }, 400);
    const sort = Number.isInteger(body?.sort) ? Number(body?.sort) : Number((await db.select({ value: count() }).from(galleryGroups))[0]?.value ?? 0);
    const [group] = await db.insert(galleryGroups).values({ title, note: body?.note?.trim() ?? "", sort }).returning();
    if (!group) return c.json({ error: "The group was not saved." }, 500);
    const pieces = cleanPieces(body?.pieces);
    if (pieces.length) {
      await db.insert(galleryPieces).values(pieces.map((piece, index) => ({ ...piece, groupId: group.id, sort: index })));
    }
    return c.json({ id: group.id }, 201);
  });

  app.put("/manage/gallery/groups/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json<{ title?: string; note?: string; sort?: number; pieces?: unknown }>().catch(() => null);
    const title = body?.title?.trim() ?? "";
    if (!Number.isInteger(id) || !title) return c.json({ error: "A gallery group needs a title." }, 400);
    const sort = Number.isInteger(Number(body?.sort)) ? Number(body?.sort) : 0;
    const [group] = await db.update(galleryGroups).set({ title, note: body?.note?.trim() ?? "", sort }).where(eq(galleryGroups.id, id)).returning();
    if (!group) return c.json({ error: "That group is not here." }, 404);
    await db.delete(galleryPieces).where(eq(galleryPieces.groupId, id));
    const pieces = cleanPieces(body?.pieces);
    if (pieces.length) {
      await db.insert(galleryPieces).values(pieces.map((piece, index) => ({ ...piece, groupId: id, sort: index })));
    }
    return c.json({ ok: true });
  });

  app.delete("/manage/gallery/groups/:id", async (c) => {
    const id = Number(c.req.param("id"));
    if (!Number.isInteger(id)) return c.json({ error: "That group is not here." }, 400);
    const [row] = await db.delete(galleryGroups).where(eq(galleryGroups.id, id)).returning({ id: galleryGroups.id });
    if (!row) return c.json({ error: "That group is not here." }, 404);
    return c.json({ ok: true });
  });

  app.put("/manage/pages/:key", async (c) => {
    const key = c.req.param("key");
    if (!pageKeys.has(key)) return c.json({ error: "That page is not here." }, 404);
    const document = await c.req.json<unknown>().catch(() => null);
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      return c.json({ error: "The page needs its words." }, 400);
    }
    const text = JSON.stringify(document);
    const [existing] = await db.select({ key: sitePages.key }).from(sitePages).where(eq(sitePages.key, key)).limit(1);
    if (existing) await db.update(sitePages).set({ document: text }).where(eq(sitePages.key, key));
    else await db.insert(sitePages).values({ key, document: text });
    return c.json(document);
  });

  app.post("/manage/pictures", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    if (!(file instanceof File)) return c.json({ error: "Choose a picture." }, 400);
    const extensions: Record<string, string> = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = extensions[file.type];
    if (!extension) return c.json({ error: "Use a png, jpg, webp, or gif." }, 400);
    if (file.size > 12 * 1024 * 1024) return c.json({ error: "That picture is larger than 12 MB." }, 400);
    const name = `${Date.now().toString(36)}-${randomBytes(4).toString("hex")}.${extension}`;
    const folder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../assets/uploads");
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, name), Buffer.from(await file.arrayBuffer()));
    return c.json({ src: `/assets/uploads/${name}` });
  });
}
