export type Book = {
  id: number;
  slug: string;
  title: string;
  shortTitle: string;
  badge: string;
  shortBadge: string;
  body: string;
  cover: string;
  coverAlt: string;
  carouselAlt: string;
  coverStyle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  shelf: string;
  sort: number;
};

export type BooksIntro = {
  eyebrow: string;
  title: string;
  lede: string;
  button: string;
  heading: string;
  intro: string;
  growing: string;
  fanLabel: string;
  fanLeft: string;
  fanCenter: string;
  fanRight: string;
};

export type GalleryPiece = { src: string; alt: string; caption: string; tone: string };
export type GalleryGroup = { id: number; title: string; note: string; pieces: GalleryPiece[] };
export type GalleryIntro = {
  eyebrow: string;
  title: string;
  lede: string;
  button: string;
  intro: string;
  stack: GalleryPiece[];
};

export type AboutPage = {
  eyebrow: string;
  title: string;
  lede: string;
  button: string;
  buttonHref: string;
  heroImage: string;
  heroAlt: string;
  kicker: string;
  heading: string;
  body: string;
  portrait: string;
  portraitAlt: string;
  cards: { title: string; body: string }[];
  emailLabel: string;
  email: string;
};

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function loadBooks() {
  return readJson<Book[]>("/api/books");
}

export function loadBooksIntro() {
  return readJson<BooksIntro>("/api/pages/books");
}

export function loadGallery() {
  return readJson<{ page: GalleryIntro | null; groups: GalleryGroup[] }>("/api/gallery");
}

export function loadAbout() {
  return readJson<AboutPage>("/api/pages/about");
}

function escapeText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function carouselMarkup(books: Book[]) {
  return books.map((book) => {
    const title = book.shortTitle || book.title;
    const badge = book.shortBadge || book.badge;
    const href = book.shelf === "card" ? "/books#upcoming" : `/books#${book.slug}`;
    const visual = book.cover
      ? `<img${book.coverStyle === "night" ? ' class="book-night"' : ""} src="${escapeText(book.cover)}" alt="${escapeText(book.carouselAlt || book.coverAlt)}">`
      : `<span class="book-plain" aria-hidden="true">${escapeText(title)}</span>`;
    return `<a class="book" href="${escapeText(href)}">${visual}<strong>${escapeText(title)}</strong><span>${escapeText(badge)}</span></a>`;
  }).join("");
}
