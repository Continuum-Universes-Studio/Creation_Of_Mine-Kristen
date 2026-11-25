import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { count } from "drizzle-orm";
import postgres from "postgres";
import { db, sql } from "./db.js";
import { hashPassword } from "./passwords.js";
import { ensureContent } from "./ensure.js";
import { stories, users } from "./schema.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is missing.");

const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
const maintenanceUrl = new URL(databaseUrl);
maintenanceUrl.pathname = "/postgres";

const maintenance = postgres(maintenanceUrl.toString(), { max: 1 });
const existing = await maintenance<{ datname: string }[]>`
  select datname from pg_database where datname = ${databaseName}
`;
if (existing.length === 0) {
  await maintenance.unsafe(`create database ${databaseName}`);
}
await maintenance.end();

await sql.unsafe(`
  create table if not exists users (
    id serial primary key,
    username text not null unique,
    password_hash text not null,
    created_at timestamptz not null default now()
  )
`);
await sql.unsafe(`
  create table if not exists sessions (
    id serial primary key,
    user_id integer not null references users(id) on delete cascade,
    token_hash text not null unique,
    expires_at timestamptz not null
  )
`);
await sql.unsafe(`
  create table if not exists stories (
    id serial primary key,
    slug text not null unique,
    title text not null,
    body text not null,
    published_on date not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )
`);

const username = process.env.ADMIN_USERNAME ?? "admin";
const password = process.env.ADMIN_PASSWORD;
if (!password) throw new Error("ADMIN_PASSWORD is missing.");

const [userCount] = await db.select({ value: count() }).from(users);
if (userCount.value === 0) {
  await db.insert(users).values({ username, passwordHash: await hashPassword(password) });
}

const [storyCount] = await db.select({ value: count() }).from(stories);
if (storyCount.value === 0) {
  const notesPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../js/posts.json");
  const notes = JSON.parse(await readFile(notesPath, "utf8")) as Array<{
    slug: string;
    title: string;
    date: string;
    text: string;
  }>;
  if (notes.length > 0) {
    await db.insert(stories).values(
      notes.map((note) => ({
        slug: note.slug,
        title: note.title,
        body: note.text.trim(),
        publishedOn: note.date,
      })),
    );
  }
}

await ensureContent();

console.log(`Local database ready. Sign in as ${username}.`);
await sql.end();
