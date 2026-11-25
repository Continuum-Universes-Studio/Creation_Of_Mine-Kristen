export type StoryPicture = { after: number; srcs: string[] };

export type Story = {
  id: number;
  slug: string;
  title: string;
  date: string;
  body: string;
  pictures: StoryPicture[];
};

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

export type GalleryPiece = { id?: number; src: string; alt: string; caption: string; tone: string };
export type GalleryGroup = { id: number; title: string; note: string; sort: number; pieces: GalleryPiece[] };
export type GalleryStack = { src: string; alt: string; tone: string };
export type GalleryIntro = { eyebrow: string; title: string; lede: string; button: string; intro: string; stack: GalleryStack[] };
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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "The desk could not finish that.");
  return data;
}

export function currentSession() {
  return request<{ username: string | null }>("/api/session");
}

export function signIn(username: string, password: string) {
  return request<{ username: string }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function signOut() {
  return request<{ ok: boolean }>("/api/session", { method: "DELETE" });
}

export function listStories() {
  return request<Story[]>("/api/manage/stories");
}

export function saveStory(story: { id?: number; title: string; body: string; date: string; pictures: { after: number; src: string }[] }) {
  const payload = { title: story.title, body: story.body, date: story.date, pictures: story.pictures };
  if (story.id) {
    return request<Story>(`/api/manage/stories/${story.id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  }
  return request<Story>("/api/manage/stories", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function saveStoryOrder(ids: number[]) {
  return request<{ ok: boolean }>("/api/manage/stories/order", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function deleteStory(id: number) {
  return request<{ ok: boolean }>(`/api/manage/stories/${id}`, { method: "DELETE" });
}

export function listBooks() {
  return request<Book[]>("/api/manage/books");
}

export function saveBookOrder(ids: number[]) {
  return request<{ ok: boolean }>("/api/manage/books/order", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function saveBook(book: Partial<Book> & { title: string }) {
  const { id, slug: _slug, ...payload } = book;
  if (id) return request<Book>(`/api/manage/books/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  return request<Book>("/api/manage/books", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteBook(id: number) {
  return request<{ ok: boolean }>(`/api/manage/books/${id}`, { method: "DELETE" });
}

export function loadGallery() {
  return request<{ page: GalleryIntro; groups: GalleryGroup[] }>("/api/manage/gallery");
}

export function saveGalleryOrder(ids: number[]) {
  return request<{ ok: boolean }>("/api/manage/gallery/groups/order", {
    method: "PUT",
    body: JSON.stringify({ ids }),
  });
}

export function saveGalleryGroup(group: { id?: number; title: string; note: string; sort: number; pieces: GalleryPiece[] }) {
  const payload = { title: group.title, note: group.note, sort: group.sort, pieces: group.pieces };
  if (group.id) return request<{ ok: boolean }>(`/api/manage/gallery/groups/${group.id}`, { method: "PUT", body: JSON.stringify(payload) });
  return request<{ id: number }>("/api/manage/gallery/groups", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteGalleryGroup(id: number) {
  return request<{ ok: boolean }>(`/api/manage/gallery/groups/${id}`, { method: "DELETE" });
}

export function loadPage<T>(key: "books" | "gallery" | "about") {
  return request<T>(`/api/pages/${key}`);
}

export function savePage<T>(key: "books" | "gallery" | "about", document: T) {
  return request<T>(`/api/manage/pages/${key}`, { method: "PUT", body: JSON.stringify(document) });
}

export async function uploadPicture(file: File) {
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/manage/pictures", { method: "POST", body, credentials: "include" });
  const data = (await response.json().catch(() => ({}))) as { src?: string; error?: string };
  if (!response.ok || !data.src) throw new Error(data.error || "The picture did not upload.");
  return data.src;
}
