import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { loadPage, savePage, type BooksIntro } from "../api";

export default function BooksIntroPage() {
  const [page, setPage] = useState<BooksIntro | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPage<BooksIntro>("books")
      .then((next) => {
        if (alive) setPage(next);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "The books page did not load.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!page) return;
    setError("");
    setSaved(false);
    try {
      setPage(await savePage("books", page));
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The page was not saved.");
    }
  }

  if (!page) return <p className="notice">{error || "Opening the books page…"}</p>;

  function set<K extends keyof BooksIntro>(key: K, value: BooksIntro[K]) {
    setPage((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <form className="sheet" onSubmit={onSubmit}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Books page</h2>
        <Link to="/books">Back to the books</Link>
      </div>
      <div className="fields">
        <label className="wide"><span>Heading<span className="where"> (the big title)</span></span><input value={page.title} onChange={(event) => set("title", event.target.value)} /></label>
        <label className="wide"><span>Introduction<span className="where"> (the sentence under the title)</span></span><textarea value={page.lede} onChange={(event) => set("lede", event.target.value)} /></label>
        <label className="wide"><span>Shelf note<span className="where"> (the paragraph under “My books”)</span></span><textarea value={page.intro} onChange={(event) => set("intro", event.target.value)} /></label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="notice">Saved.</p> : null}
      <button type="submit">Save</button>
    </form>
  );
}
