import { useEffect, useState } from "react";
import MarkupPage from "../components/MarkupPage";
import TextLink from "../components/TextLink";
import booksHtml from "../content/books";
import { loadBooks, loadBooksIntro, type Book, type BooksIntro } from "../data/library";

function paragraphs(value: string) {
  return value.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function BookBlock({ book }: { book: Book }) {
  return (
    <article className="book-block" id={book.slug}>
      {book.cover ? (
        <img src={book.cover} alt={book.coverAlt} style={book.coverStyle === "night" ? { background: "#102033" } : undefined} />
      ) : (
        <span className="book-plain">{book.shortTitle || book.title}</span>
      )}
      <div>
        {book.badge ? <span className={book.badge === "Out now" ? "badge" : "badge wait"}>{book.badge}</span> : null}
        <h3>{book.title}</h3>
        {paragraphs(book.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {book.primaryHref ? (
          <div className="actions">
            <TextLink className="btn" href={book.primaryHref}>{book.primaryLabel}</TextLink>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [intro, setIntro] = useState<BooksIntro | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadBooks(), loadBooksIntro()]).then(([nextBooks, nextIntro]) => {
      if (!alive) return;
      if (!nextBooks || !nextIntro) {
        setFailed(true);
        return;
      }
      setBooks(nextBooks);
      setIntro(nextIntro);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <MarkupPage html={booksHtml} />;
  if (!books || !intro) {
    return <main><section className="section"><div className="wrap"><p>Opening the books…</p></div></section></main>;
  }

  const shelf = books.filter((book) => book.shelf !== "card");
  const growing = books.filter((book) => book.shelf === "card");
  const [center, left, right] = books.filter((book) => book.cover);
  const fan = [left, center, right].filter((book): book is Book => Boolean(book));

  return (
    <main>
      <section className="page-hero wrap">
        <div>
          <p className="eyebrow" style={{ justifyContent: "flex-start" }}>{intro.eyebrow}</p>
          <h1>{intro.title}</h1>
          <p className="lede">{intro.lede}</p>
          <p><a className="btn" href="#my-books">{intro.button}</a></p>
        </div>
        {center ? (
          <div className="art book-fan" role="img" aria-label={`A little handful of story books: ${fan.map((book) => book.shortTitle || book.title).join(", ")}`}>
            {left ? <img className="fan-left" src={left.cover} alt="" style={left.coverStyle === "night" ? { background: "#102033" } : undefined} /> : null}
            {right ? <img className="fan-right" src={right.cover} alt="" style={right.coverStyle === "night" ? { background: "#102033" } : undefined} /> : null}
            <img className="fan-center" src={center.cover} alt="" style={center.coverStyle === "night" ? { background: "#102033" } : undefined} />
          </div>
        ) : null}
      </section>
      <section className="section" id="my-books">
        <div className="wrap">
          <h2>{intro.heading}</h2>
          <p>{intro.intro}</p>
          {shelf.map((book) => <BookBlock book={book} key={book.id} />)}
        </div>
      </section>
      {growing.length ? (
        <section className="section" id="upcoming" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <h2>{intro.growing}</h2>
            <div className="card-grid">
              {growing.map((book) => (
                <article className="card" key={book.id}>
                  {book.badge ? <span className="badge wait">{book.badge}</span> : null}
                  <h3>{book.title}</h3>
                  {paragraphs(book.body).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
