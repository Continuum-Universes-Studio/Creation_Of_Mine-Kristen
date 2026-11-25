import { useEffect, useState, type FormEvent } from "react";
import { loadPage, savePage, type AboutPage } from "../api";
import PictureField from "../components/PictureField";

export default function AboutDeskPage() {
  const [page, setPage] = useState<AboutPage | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    loadPage<AboutPage>("about")
      .then((next) => {
        if (alive) setPage(next);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "The about page did not load.");
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
      setPage(await savePage("about", page));
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The page was not saved.");
    }
  }

  if (!page) return <p className="notice">{error || "Opening the about page…"}</p>;

  function set<K extends keyof AboutPage>(key: K, value: AboutPage[K]) {
    setPage((current) => current ? { ...current, [key]: value } : current);
  }

  return (
    <form className="sheet" onSubmit={onSubmit}>
      <h2>About</h2>
      <details className="dropdown about-card">
        <summary><h2>Heading and hero</h2></summary>
        <div className="fields">
          <label className="wide">Heading<input value={page.title} onChange={(event) => set("title", event.target.value)} /></label>
          <label className="wide">Welcome<textarea value={page.lede} onChange={(event) => set("lede", event.target.value)} /></label>
          <PictureField label="Hero picture" value={page.heroImage} onChange={(value) => set("heroImage", value)} />
          <label className="wide">Hero description<input value={page.heroAlt} onChange={(event) => set("heroAlt", event.target.value)} /></label>
        </div>
      </details>
      <details className="dropdown about-card">
        <summary><h2>The story and portrait</h2></summary>
        <div className="fields">
          <label>Small heading<input value={page.kicker} onChange={(event) => set("kicker", event.target.value)} /></label>
          <label>Section heading<input value={page.heading} onChange={(event) => set("heading", event.target.value)} /></label>
          <label className="wide">
            The story
            <textarea value={page.body} onChange={(event) => set("body", event.target.value)} />
          </label>
          <PictureField label="Portrait" value={page.portrait} onChange={(value) => set("portrait", value)} />
          <label>Portrait description<input value={page.portraitAlt} onChange={(event) => set("portraitAlt", event.target.value)} /></label>
        </div>
      </details>
      {page.cards.map((card, index) => (
        <details className="dropdown about-card" key={`card-${index}`}>
          <summary><h2>Card{card.title ? <span className="where"> ({card.title})</span> : null}</h2></summary>
          <label>Card title<input value={card.title} onChange={(event) => set("cards", page.cards.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} /></label>
          <label>Card words<textarea value={card.body} onChange={(event) => set("cards", page.cards.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item))} /></label>
        </details>
      ))}
      <div className="fields">
        <label>Email button<input value={page.emailLabel} onChange={(event) => set("emailLabel", event.target.value)} /></label>
        <label>Email<input value={page.email} onChange={(event) => set("email", event.target.value)} /></label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="notice">Saved.</p> : null}
      <button type="submit">Save</button>
    </form>
  );
}
