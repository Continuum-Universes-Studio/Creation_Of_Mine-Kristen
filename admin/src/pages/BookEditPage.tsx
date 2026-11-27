import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteBook, listBooks, saveBook, type Book } from "../api";
import { useConfirm } from "../components/Confirm";
import PictureField from "../components/PictureField";

const empty: Omit<Book, "id" | "slug"> = {
  title: "",
  shortTitle: "",
  badge: "",
  shortBadge: "",
  body: "",
  cover: "",
  coverAlt: "",
  carouselAlt: "",
  coverStyle: "",
  primaryLabel: "",
  primaryHref: "",
  secondaryLabel: "",
  secondaryHref: "",
  shelf: "block",
  inCarousel: true,
  sort: 0,
};

export default function BookEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const bookId = id ? Number(id) : undefined;
  const [book, setBook] = useState(empty);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const [ready, setReady] = useState(!bookId);

  useEffect(() => {
    if (!bookId) return;
    let alive = true;
    listBooks()
      .then((rows) => {
        const found = rows.find((item) => item.id === bookId);
        if (!alive) return;
        if (!found) {
          setError("That book is not here.");
          setReady(true);
          return;
        }
        const { id: _id, slug: _slug, ...rest } = found;
        setBook(rest);
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        setError(caught instanceof Error ? caught.message : "The book did not load.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [bookId]);

  function set<K extends keyof typeof book>(key: K, value: (typeof book)[K]) {
    setBook((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const sort = bookId ? book.sort : (await listBooks()).length;
      await saveBook({ ...book, id: bookId, sort });
      navigate("/books");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The book was not saved.");
    }
  }

  async function onDelete() {
    if (!bookId) return;
    const yes = await confirm(`Remove “${book.title || "this book"}”?`);
    if (!yes) return;
    setError("");
    try {
      await deleteBook(bookId);
      navigate("/books");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The book was not removed.");
    }
  }

  if (!ready) return <p className="notice">Opening the book…</p>;

  return (
    <form className="sheet" onSubmit={onSubmit}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{bookId ? "Edit book" : "New book"}</h2>
        <Link to="/books">Back to the books</Link>
      </div>
      <div className="fields">
        <label className="wide">
          Title
          <input value={book.title} onChange={(event) => set("title", event.target.value)} required />
        </label>
        <label>
          Badge
          <input value={book.badge} onChange={(event) => set("badge", event.target.value)} />
        </label>
        <label>
          Where it sits
          <select value={book.shelf} onChange={(event) => set("shelf", event.target.value)}>
            <option value="block">On the shelf</option>
            <option value="card">Still growing</option>
          </select>
        </label>
        <div className="wide">
          <PictureField
            label="Cover"
            value={book.cover}
            onChange={(cover) => set("cover", cover)}
            removeLabel="Remove cover"
            onRemove={() => {
              void confirm("Remove this cover?").then((yes) => {
                if (yes) set("cover", "");
              });
            }}
          />
        </div>
        <label>
          Cover description
          <input value={book.coverAlt} onChange={(event) => set("coverAlt", event.target.value)} />
        </label>
        <label>
          Carousel description
          <input value={book.carouselAlt} onChange={(event) => set("carouselAlt", event.target.value)} />
        </label>
        <label className="choice">
          <input type="checkbox" checked={book.coverStyle === "night"} onChange={(event) => set("coverStyle", event.target.checked ? "night" : "")} />
          Dark cover background
        </label>
        <label className="wide">
          Words
          <textarea value={book.body} onChange={(event) => set("body", event.target.value)} />
        </label>
        <label>
          Button
          <input value={book.primaryLabel} onChange={(event) => set("primaryLabel", event.target.value)} />
        </label>
        <label>
          Link
          <input value={book.primaryHref} onChange={(event) => set("primaryHref", event.target.value)} />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button type="submit">Save</button>
        {bookId ? <button className="quiet" type="button" onClick={() => void onDelete()}>Remove</button> : null}
      </div>
    </form>
  );
}
