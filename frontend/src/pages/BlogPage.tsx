import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { storyPictures } from "../data/storyPictures";
import { formatStoryDate, loadStoryPage, type Story } from "../data/stories";

const pageSize = 3;

function letterPreview(html: string) {
  const holder = document.createElement("div");
  holder.innerHTML = html;
  const parts = [...holder.querySelectorAll("p")].map((paragraph) => paragraph.textContent?.trim() ?? "").filter(Boolean);
  return (parts.length ? parts.join(" ") : holder.textContent ?? "").replace(/\s+/g, " ").trim();
}

function letterIdFromHash(hash: string) {
  const id = decodeURIComponent(hash.replace(/^#/, ""));
  return id && id !== "notes" ? id : "";
}

export default function BlogPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const storiesRef = useRef<Story[]>([]);
  const totalRef = useRef(0);
  const request = useRef(0);
  const placed = useRef("");
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (totalRef.current > 0 && storiesRef.current.length >= totalRef.current) return;
    const offset = storiesRef.current.length;
    const ticket = ++request.current;
    setLoading(true);
    try {
      const page = await loadStoryPage(offset, pageSize);
      if (ticket !== request.current) return;
      if (!page.stories.length) {
        totalRef.current = storiesRef.current.length;
        setTotal(storiesRef.current.length);
        return;
      }
      const seen = new Set(storiesRef.current.map((story) => story.slug));
      const next = [...storiesRef.current, ...page.stories.filter((story) => !seen.has(story.slug))];
      storiesRef.current = next;
      totalRef.current = page.total;
      setStories(next);
      setTotal(page.total);
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useEffect(() => {
    void loadMore();
  }, [loadMore]);

  useEffect(() => {
    const id = letterIdFromHash(location.hash);
    if (!id || !total) return;
    if (stories.some((story) => story.slug === id)) return;
    if (stories.length >= total) return;
    void loadMore();
  }, [location.hash, stories, total, loadMore]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "360px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, stories.length, total]);

  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (id === "notes") {
      document.getElementById("notes")?.scrollIntoView({ block: "start" });
      return;
    }
    if (!id) window.scrollTo(0, 0);
  }, [location.hash]);

  useEffect(() => {
    const id = letterIdFromHash(location.hash);
    if (!id) {
      placed.current = "";
      return;
    }
    if (placed.current === id) return;
    const letter = document.getElementById(id);
    if (!letter) return;
    placed.current = id;
    const place = () => letter.scrollIntoView({ block: "start" });
    place();
    const pictures = [...document.querySelectorAll<HTMLImageElement>("#notes img")].filter((img) => !img.complete);
    pictures.forEach((img) => img.addEventListener("load", place, { once: true }));
    return () => pictures.forEach((img) => img.removeEventListener("load", place));
  }, [stories, location.hash]);

  return (
    <main>
      <section className="page-hero wrap">
        <div>
          <p className="eyebrow" style={{ justifyContent: "flex-start" }}>Blog</p>
          <h1>Stories, ideas, and a little inspiration.</h1>
          <p className="lede">Welcome to Storytime News, where Kristen shares book news, characters, and the occasional coloring page.</p>
          <p><a className="btn" href="#notes">Read the Blog</a></p>
        </div>
        <div className="art story-art">
          <img src="/assets/flying-fairy.png" alt="A little fairy flying on a bumblebee" />
        </div>
      </section>
      <section className="section" id="notes" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <p>Hi there. This is the news and the updates for Kristen Jensen, author, illustrator, and the person behind Creations of Mine. She is glad you stopped by.</p>
          {stories.map((story) => {
            const pictures = story.pictures?.[0] ?? (story.pictures ? undefined : storyPictures[story.slug]?.[0]);
            return (
              <article className="entry" id={story.slug} key={story.slug}>
                <p className="meta">{formatStoryDate(story.date)}</p>
                <h2>
                  <Link to={`/blog/${story.slug}`}>{story.title}</Link>
                </h2>
                <Link className="entry-open" to={`/blog/${story.slug}`}>
                  {pictures ? (
                    <div className={pictures.srcs.length > 1 ? "entry-pictures" : "entry-pictures single"}>
                      {pictures.srcs.map((src) => (
                        <img src={src} alt="" key={src} loading="lazy" />
                      ))}
                    </div>
                  ) : null}
                  <p className="entry-excerpt">{letterPreview(story.html)}</p>
                </Link>
              </article>
            );
          })}
          {loading ? <p className="meta">{stories.length ? "Loading the next letters…" : "Loading the letters…"}</p> : null}
          {total > stories.length ? <div ref={sentinel} className="notes-sentinel" /> : null}
        </div>
      </section>
    </main>
  );
}
