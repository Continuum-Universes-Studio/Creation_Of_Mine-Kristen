import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  publishedOn: date("published_on").notNull(),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storyPictures = pgTable("story_pictures", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  afterParagraph: integer("after_paragraph").notNull().default(0),
  src: text("src").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  shortTitle: text("short_title").notNull().default(""),
  badge: text("badge").notNull().default(""),
  shortBadge: text("short_badge").notNull().default(""),
  body: text("body").notNull().default(""),
  cover: text("cover").notNull().default(""),
  coverAlt: text("cover_alt").notNull().default(""),
  carouselAlt: text("carousel_alt").notNull().default(""),
  coverStyle: text("cover_style").notNull().default(""),
  primaryLabel: text("primary_label").notNull().default(""),
  primaryHref: text("primary_href").notNull().default(""),
  secondaryLabel: text("secondary_label").notNull().default(""),
  secondaryHref: text("secondary_href").notNull().default(""),
  shelf: text("shelf").notNull().default("block"),
  sort: integer("sort").notNull().default(0),
});

export const galleryGroups = pgTable("gallery_groups", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const galleryPieces = pgTable("gallery_pieces", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => galleryGroups.id, { onDelete: "cascade" }),
  src: text("src").notNull(),
  alt: text("alt").notNull().default(""),
  caption: text("caption").notNull().default(""),
  tone: text("tone").notNull().default(""),
  sort: integer("sort").notNull().default(0),
});

export const sitePages = pgTable("site_pages", {
  key: text("key").primaryKey(),
  document: text("document").notNull(),
});
