import { count, desc, eq } from "drizzle-orm";
import { db, sql } from "./db.js";
import { bookSeed, gallerySeed, pageSeed, storyPictureSeed } from "./seedData.js";
import { books, galleryGroups, galleryPieces, sitePages, stories, storyPictures } from "./schema.js";

export async function ensureContent() {
  await sql.unsafe(`alter table stories add column if not exists sort integer not null default 0`);
  const ordered = await db.select({ id: stories.id, sort: stories.sort }).from(stories).orderBy(desc(stories.publishedOn), desc(stories.id));
  if (ordered.length > 1 && ordered.every((row) => row.sort === 0)) {
    for (const [sort, row] of ordered.entries()) {
      await db.update(stories).set({ sort }).where(eq(stories.id, row.id));
    }
  }

  await sql.unsafe(`
    create table if not exists story_pictures (
      id serial primary key,
      story_id integer not null references stories(id) on delete cascade,
      after_paragraph integer not null default 0,
      src text not null,
      sort integer not null default 0
    )
  `);
  await sql.unsafe(`
    create table if not exists books (
      id serial primary key,
      slug text not null unique,
      title text not null,
      short_title text not null default '',
      badge text not null default '',
      short_badge text not null default '',
      body text not null default '',
      cover text not null default '',
      cover_alt text not null default '',
      carousel_alt text not null default '',
      cover_style text not null default '',
      primary_label text not null default '',
      primary_href text not null default '',
      secondary_label text not null default '',
      secondary_href text not null default '',
      shelf text not null default 'block',
      sort integer not null default 0
    )
  `);
  await sql.unsafe(`
    create table if not exists gallery_groups (
      id serial primary key,
      title text not null,
      note text not null default '',
      sort integer not null default 0
    )
  `);
  await sql.unsafe(`
    create table if not exists gallery_pieces (
      id serial primary key,
      group_id integer not null references gallery_groups(id) on delete cascade,
      src text not null,
      alt text not null default '',
      caption text not null default '',
      tone text not null default '',
      sort integer not null default 0
    )
  `);
  await sql.unsafe(`
    create table if not exists site_pages (
      key text primary key,
      document text not null
    )
  `);

  const [bookCount] = await db.select({ value: count() }).from(books);
  if (Number(bookCount?.value ?? 0) === 0) {
    await db.insert(books).values(bookSeed.map((book, sort) => ({ ...book, sort })));
  }

  const [pageCount] = await db.select({ value: count() }).from(sitePages);
  if (Number(pageCount?.value ?? 0) === 0) {
    await db.insert(sitePages).values(
      Object.entries(pageSeed).map(([key, document]) => ({ key, document: JSON.stringify(document) })),
    );
  }

  const [groupCount] = await db.select({ value: count() }).from(galleryGroups);
  if (Number(groupCount?.value ?? 0) === 0) {
    for (const [sort, group] of gallerySeed.entries()) {
      const [created] = await db.insert(galleryGroups).values({ title: group.title, note: group.note, sort }).returning();
      if (!created || !group.pieces.length) continue;
      await db.insert(galleryPieces).values(
        group.pieces.map((piece, index) => ({ ...piece, groupId: created.id, sort: index })),
      );
    }
  }

  const [pictureCount] = await db.select({ value: count() }).from(storyPictures);
  if (Number(pictureCount?.value ?? 0) === 0) {
    const rows = await db.select({ id: stories.id, slug: stories.slug }).from(stories);
    const bySlug = new Map(rows.map((row) => [row.slug, row.id]));
    const values: { storyId: number; afterParagraph: number; src: string; sort: number }[] = [];
    for (const [slug, groups] of Object.entries(storyPictureSeed)) {
      const storyId = bySlug.get(slug);
      if (!storyId) continue;
      let sort = 0;
      for (const group of groups) {
        for (const src of group.srcs) {
          values.push({ storyId, afterParagraph: group.after, src, sort });
          sort += 1;
        }
      }
    }
    if (values.length) await db.insert(storyPictures).values(values);
  }
}
