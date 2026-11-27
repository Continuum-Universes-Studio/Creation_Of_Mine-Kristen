import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { serve } from "@hono/node-server";
import { and, asc, count, desc, eq, gt, sql } from "drizzle-orm";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { db } from "./db.js";
import { hashPassword, verifyPassword } from "./passwords.js";
import { ensureContent } from "./ensure.js";
import { registerLibrary } from "./library.js";
import { cleanPictures, picturesFor, replacePictures } from "./pictures.js";
import { sessions, stories, users } from "./schema.js";
import { slugify, textToHtml } from "./text.js";

const app = new Hono();
const cookieName = "story_desk";

type SessionUser = { id: number; username: string };

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function currentUser(cookie: string | undefined): Promise<SessionUser | null> {
  if (!cookie) return null;
  const [row] = await db
    .select({ id: users.id, username: users.username })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash(cookie)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ?? null;
}

function storyJson(row: typeof stories.$inferSelect, withBody: boolean, pictures: { after: number; srcs: string[] }[]) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.publishedOn,
    html: textToHtml(row.body),
    pictures,
    ...(withBody ? { body: row.body } : {}),
  };
}

async function storyList(rows: (typeof stories.$inferSelect)[], withBody: boolean) {
  const pictures = await picturesFor(rows.map((row) => row.id));
  return rows.map((row) => storyJson(row, withBody, pictures.get(row.id) ?? []));
}

app.get("/health", (c) => c.json({ ok: true }));

app.get("/stories", async (c) => {
  const limitRaw = c.req.query("limit");
  const offsetRaw = c.req.query("offset");
  const order = [asc(stories.sort), desc(stories.publishedOn), desc(stories.id)] as const;
  if (limitRaw === undefined && offsetRaw === undefined) {
    const rows = await db.select().from(stories).orderBy(...order);
    return c.json(await storyList(rows, false));
  }
  const limit = Number(limitRaw ?? 3);
  const offset = Number(offsetRaw ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 24 || !Number.isInteger(offset) || offset < 0) {
    return c.json({ error: "Ask for a small page of stories." }, 400);
  }
  const [counted] = await db.select({ value: count() }).from(stories);
  const rows = await db.select().from(stories).orderBy(...order).limit(limit).offset(offset);
  return c.json({
    stories: await storyList(rows, false),
    total: Number(counted?.value ?? 0),
  });
});

app.post("/session", async (c) => {
  const body = await c.req.json<{ username?: string; password?: string }>().catch(() => null);
  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "That sign-in did not match." }, 401);
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  await db.insert(sessions).values({ userId: user.id, tokenHash: tokenHash(token), expiresAt });
  setCookie(c, cookieName, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    secure: false,
    expires: expiresAt,
  });
  return c.json({ username: user.username });
});

app.get("/session", async (c) => {
  const user = await currentUser(getCookie(c, cookieName));
  if (!user) return c.json({ username: null });
  return c.json({ username: user.username });
});

app.delete("/session", async (c) => {
  const token = getCookie(c, cookieName);
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  deleteCookie(c, cookieName, { path: "/" });
  return c.json({ ok: true });
});

app.use("/manage/*", async (c, next) => {
  const user = await currentUser(getCookie(c, cookieName));
  if (!user) return c.json({ error: "Sign in first." }, 401);
  await next();
});

app.put("/manage/account", async (c) => {
  const sessionUser = await currentUser(getCookie(c, cookieName));
  if (!sessionUser) return c.json({ error: "Sign in first." }, 401);
  const body = await c.req.json<{ username?: string; currentPassword?: string; newPassword?: string }>().catch(() => null);
  const username = body?.username?.trim() ?? "";
  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  if (!username || username.length > 80) return c.json({ error: "Choose a name." }, 400);
  if (!currentPassword) return c.json({ error: "Type the current password." }, 400);
  if (newPassword.length > 200) return c.json({ error: "Choose a shorter password." }, 400);
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return c.json({ error: "That password did not match." }, 400);
  }
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (taken && taken.id !== user.id) return c.json({ error: "That name is already used." }, 409);
  await db
    .update(users)
    .set({
      username,
      ...(newPassword ? { passwordHash: await hashPassword(newPassword) } : {}),
    })
    .where(eq(users.id, user.id));
  return c.json({ username });
});

registerLibrary(app);

app.get("/manage/stories", async (c) => {
  const rows = await db.select().from(stories).orderBy(asc(stories.sort), desc(stories.publishedOn), desc(stories.id));
  return c.json(await storyList(rows, true));
});

app.post("/manage/stories", async (c) => {
  const body = await c.req.json<{ title?: string; body?: string; date?: string; pictures?: unknown }>().catch(() => null);
  const title = body?.title?.trim() ?? "";
  const text = body?.body?.trim() ?? "";
  const date = body?.date?.trim() ?? "";
  if (!title || !text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "A story needs a title, a date, and some words." }, 400);
  }
  const slug = await uniqueSlug(slugify(title));
  await db.update(stories).set({ sort: sql`${stories.sort} + 1` });
  const [row] = await db.insert(stories).values({ slug, title, body: text, publishedOn: date, sort: 0 }).returning();
  if (!row) return c.json({ error: "The story was not saved." }, 500);
  await replacePictures(row.id, cleanPictures(body?.pictures));
  return c.json((await storyList([row], true))[0], 201);
});

app.put("/manage/stories/order", async (c) => {
  const body = await c.req.json<{ ids?: unknown }>().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id): id is number => Number.isInteger(id)) : [];
  if (!ids.length) return c.json({ error: "Choose an order for the letters." }, 400);
  for (const [sort, id] of ids.entries()) {
    await db.update(stories).set({ sort }).where(eq(stories.id, id));
  }
  return c.json({ ok: true });
});

app.put("/manage/stories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ title?: string; body?: string; date?: string; pictures?: unknown }>().catch(() => null);
  const title = body?.title?.trim() ?? "";
  const text = body?.body?.trim() ?? "";
  const date = body?.date?.trim() ?? "";
  if (!Number.isInteger(id) || !title || !text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return c.json({ error: "A story needs a title, a date, and some words." }, 400);
  }
  const [row] = await db
    .update(stories)
    .set({ title, body: text, publishedOn: date, updatedAt: new Date() })
    .where(eq(stories.id, id))
    .returning();
  if (!row) return c.json({ error: "That story is not here." }, 404);
  if (Array.isArray(body?.pictures)) await replacePictures(row.id, cleanPictures(body.pictures));
  return c.json((await storyList([row], true))[0]);
});

app.delete("/manage/stories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "That story is not here." }, 400);
  const [row] = await db.delete(stories).where(eq(stories.id, id)).returning({ id: stories.id });
  if (!row) return c.json({ error: "That story is not here." }, 404);
  return c.json({ ok: true });
});

async function uniqueSlug(base: string) {
  let slug = base;
  let n = 2;
  while (true) {
    const [found] = await db.select({ id: stories.id }).from(stories).where(eq(stories.slug, slug)).limit(1);
    if (!found) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

await ensureContent();

const routes = new Hono();
routes.route("/", app);
routes.route("/api", app);

serve({ fetch: routes.fetch, hostname: "127.0.0.1", port: 3000 }, () => {
  console.log("API listening on http://127.0.0.1:3000");
});
