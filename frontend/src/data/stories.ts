export type StoryPictures = { after: number; srcs: string[] };

export type Story = {
  slug: string;
  title: string;
  date: string;
  html: string;
  pictures?: StoryPictures[];
};

type Note = {
  slug: string;
  title: string;
  date: string;
  text: string;
};

type ApiStory = {
  slug: string;
  title: string;
  date: string;
  html: string;
  pictures?: StoryPictures[];
};

function toStory(post: ApiStory): Story {
  return {
    slug: post.slug,
    title: post.title,
    date: post.date,
    html: post.html,
    ...(Array.isArray(post.pictures) ? { pictures: post.pictures } : {}),
  };
}

async function loadFallback(): Promise<Story[]> {
  const response = await fetch("/stories.json");
  if (!response.ok) return [];
  const notes = (await response.json()) as Note[];
  return notes.map((note) => ({
    slug: note.slug,
    title: note.title,
    date: note.date,
    html: note.text
      .split(/\n\s*\n/)
      .map((paragraph) => `<p>${escapeHtml(paragraph.trim())}</p>`)
      .join(""),
  }));
}

export async function loadStories(): Promise<Story[]> {
  try {
    const response = await fetch("/api/stories");
    if (!response.ok) return loadFallback();
    const posts = (await response.json()) as ApiStory[];
    if (!Array.isArray(posts) || posts.length === 0) return loadFallback();
    return posts.map(toStory);
  } catch {
    return loadFallback();
  }
}

export async function loadStoryPage(offset: number, limit = 3): Promise<{ stories: Story[]; total: number }> {
  try {
    const response = await fetch(`/api/stories?limit=${limit}&offset=${offset}`);
    if (!response.ok) throw new Error("stories");
    const body = (await response.json()) as { stories?: ApiStory[]; total?: number } | ApiStory[];
    if (Array.isArray(body)) {
      return { stories: body.slice(offset, offset + limit).map(toStory), total: body.length };
    }
    const posts = Array.isArray(body.stories) ? body.stories : [];
    const total = Number(body.total ?? posts.length);
    if (!posts.length && offset === 0 && !total) {
      const all = await loadFallback();
      if (all.length) return { stories: all.slice(0, limit), total: all.length };
    }
    return { stories: posts.map(toStory), total };
  } catch {
    const all = await loadFallback();
    return { stories: all.slice(offset, offset + limit), total: all.length };
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function formatStoryDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
