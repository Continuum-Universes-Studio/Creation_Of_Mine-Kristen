import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StoryCopy from "../components/StoryCopy";
import { formatStoryDate, loadStories, type Story } from "../data/stories";

export default function StoryPage() {
  const { slug = "" } = useParams();
  const [story, setStory] = useState<Story | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadStories().then((stories) => {
      if (!alive) return;
      setStory(stories.find((item) => item.slug === slug) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (story === undefined) {
    return (
      <main>
        <section className="section">
          <div className="wrap">
            <p>Opening the story…</p>
          </div>
        </section>
      </main>
    );
  }

  if (!story) {
    return (
      <main>
        <section className="section">
          <div className="wrap center">
            <h1>That story wandered off.</h1>
            <p><Link className="btn" to="/blog">Back to the blog</Link></p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section">
        <div className="wrap">
          <article className="entry">
            <p className="meta">{formatStoryDate(story.date)}</p>
            <h2>{story.title}</h2>
            <StoryCopy story={story} key={story.slug} />
            <p><Link className="btn light" to={`/blog#${story.slug}`}>Back to the blog</Link></p>
          </article>
        </div>
      </section>
    </main>
  );
}
