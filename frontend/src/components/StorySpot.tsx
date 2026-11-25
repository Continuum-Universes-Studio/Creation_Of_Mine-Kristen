import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { loadStories, type Story } from "../data/stories";

function lettersFrom(html: string) {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= 110) return text;
  return `${text.slice(0, 110).trimEnd()}…`;
}

function withPicture(stories: Story[]) {
  return stories.filter((story) => story.pictures?.some((group) => group.srcs.length));
}

export default function StorySpot() {
  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (hidden) return;
    let alive = true;
    loadStories().then((rows) => {
      if (alive) setStories(withPicture(rows));
    });
    return () => {
      alive = false;
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden || stories.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % stories.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hidden, stories]);

  const story = stories[index];
  const src = story?.pictures?.flatMap((group) => group.srcs)[0];
  if (hidden || !story || !src) return null;

  return (
    <aside className="story-spot">
      <button
        className="story-spot-hide"
        type="button"
        aria-label="Hide this note"
        onClick={() => setHidden(true)}
      >
        ×
      </button>
      <Link className="story-spot-card" to={`/blog/${story.slug}`} key={story.slug}>
        <img src={src} alt="" />
        <p>{lettersFrom(story.html)}</p>
      </Link>
      <Link className="btn story-spot-visit" to="/blog">see all</Link>
    </aside>
  );
}
