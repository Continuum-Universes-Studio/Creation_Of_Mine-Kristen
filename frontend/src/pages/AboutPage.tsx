import { useEffect, useState } from "react";
import MarkupPage from "../components/MarkupPage";
import TextLink from "../components/TextLink";
import aboutHtml from "../content/about";
import { loadAbout, type AboutPage as AboutCopy } from "../data/library";

function paragraphs(value: string) {
  return value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export default function AboutPage() {
  const [page, setPage] = useState<AboutCopy | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAbout().then((next) => {
      if (!alive) return;
      if (!next) setFailed(true);
      else setPage(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <MarkupPage html={aboutHtml} />;
  if (!page) {
    return <main><section className="section"><div className="wrap"><p>Opening the page…</p></div></section></main>;
  }

  return (
    <main>
      <section className="page-hero wrap">
        <div>
          <p className="eyebrow" style={{ justifyContent: "flex-start" }}>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="lede">{page.lede}</p>
          <p><TextLink className="btn" href={page.buttonHref}>{page.button}</TextLink></p>
        </div>
        <div className="art about-art">
          <img src={page.heroImage} alt={page.heroAlt} />
        </div>
      </section>
      <section className="section">
        <div className="wrap split">
          <div>
            <p className="kicker">{page.kicker}</p>
            <h2>{page.heading}</h2>
            {paragraphs(page.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <div className="frame">
            <img src={page.portrait} alt={page.portraitAlt} />
          </div>
        </div>
      </section>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap card-grid">
          {page.cards.filter((card) => card.title || card.body).map((card) => (
            <article className="card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
        {page.email ? (
          <div className="wrap" style={{ marginTop: "1.4rem" }}>
            <a className="btn" href={`mailto:${page.email}`}>{page.emailLabel}</a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
