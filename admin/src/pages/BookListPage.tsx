import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { deleteBook, listBooks, saveBookOrder, type Book } from "../api";
import { useConfirm } from "../components/Confirm";

type Lift = {
  id: number;
  from: number;
  to: number;
  tops: number[];
  heights: number[];
};

function insertionIndex(y: number, tops: number[], heights: number[], from: number) {
  let at = 0;
  for (let index = 0; index < tops.length; index += 1) {
    if (index === from) continue;
    if (y < tops[index] + heights[index] / 2) return at;
    at += 1;
  }
  return at;
}

function shiftsFor(from: number, to: number, tops: number[], heights: number[]) {
  const order: number[] = [];
  for (let index = 0; index < tops.length; index += 1) if (index !== from) order.push(index);
  order.splice(Math.max(0, Math.min(to, order.length)), 0, from);
  const gap = tops.length > 1 ? tops[1] - tops[0] - heights[0] : 0;
  const desired = new Array<number>(tops.length);
  let y = tops[0] ?? 0;
  for (const original of order) {
    desired[original] = y;
    y += heights[original] + gap;
  }
  return desired.map((top, index) => (index === from ? 0 : top - tops[index]));
}

function applyInsert(list: Book[], from: number, to: number) {
  if (from === to) return list;
  const next = list.slice();
  const [moving] = next.splice(from, 1);
  if (!moving) return list;
  next.splice(to, 0, moving);
  return next;
}

export default function BookListPage() {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState("");
  const [lift, setLift] = useState<Lift | null>(null);
  const [held, setHeld] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<Lift | null>(null);
  const dragGen = useRef(0);
  const dropped = useRef(false);
  const saveTicket = useRef(0);
  const confirm = useConfirm();

  function showLift(next: Lift | null) {
    liftRef.current = next;
    setLift(next);
  }

  useEffect(() => {
    let alive = true;
    listBooks()
      .then((rows) => {
        if (alive) setBooks(rows);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "The books did not load.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onRemove(book: Book) {
    const yes = await confirm(`Remove “${book.title}”?`);
    if (!yes) return;
    setError("");
    try {
      await deleteBook(book.id);
      setBooks((current) => current?.filter((item) => item.id !== book.id) ?? current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The book was not removed.");
    }
  }

  async function keep(next: Book[]) {
    const ticket = ++saveTicket.current;
    setBooks(next);
    try {
      await saveBookOrder(next.map((book) => book.id));
    } catch (caught) {
      if (ticket !== saveTicket.current) return;
      setError(caught instanceof Error ? caught.message : "The order was not saved.");
      const rows = await listBooks().catch(() => null);
      if (ticket === saveTicket.current && rows) setBooks(rows);
    }
  }

  const shifts = lift ? shiftsFor(lift.from, lift.to, lift.tops, lift.heights) : null;

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Books</h2>
        <div className="row">
          <Link className="button quiet" to="/books/intro">Page introduction</Link>
          <Link className="button" to="/books/new">New book</Link>
        </div>
      </div>
      <p className="notice">The top book is the first one visitors see. Press a book and drag it up or down.</p>
      {error ? <p className="error">{error}</p> : null}
      {books === null && !error ? <p className="notice">Loading books…</p> : null}
      <div
        className="list"
        ref={listRef}
        onDragOver={(event) => {
          const current = liftRef.current;
          const list = listRef.current;
          if (!current || !list) return;
          event.preventDefault();
          const y = event.clientY - list.getBoundingClientRect().top - list.clientTop;
          const at = insertionIndex(y, current.tops, current.heights, current.from);
          if (at === current.to) return;
          showLift({ ...current, to: at });
        }}
        onDrop={(event) => {
          event.preventDefault();
          const current = liftRef.current;
          dropped.current = true;
          showLift(null);
          setHeld(false);
          if (!current || !books) return;
          const next = applyInsert(books, current.from, current.to);
          if (next !== books) void keep(next);
        }}
      >
        {books?.map((book, index) => {
          const shift = shifts?.[index] ?? 0;
          return (
            <article
              className={`card${held && lift?.id === book.id ? " lifting" : ""}`}
              key={book.id}
              draggable
              style={lift ? { transform: `translateY(${shift}px)` } : undefined}
              onDragStart={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button")) {
                  event.preventDefault();
                  return;
                }
                const list = listRef.current;
                if (!list || !books) return;
                const cards = [...list.querySelectorAll<HTMLElement>("article.card")];
                const from = books.findIndex((item) => item.id === book.id);
                const next: Lift = {
                  id: book.id,
                  from,
                  to: from,
                  tops: cards.map((card) => card.offsetTop),
                  heights: cards.map((card) => card.offsetHeight),
                };
                dragGen.current += 1;
                dropped.current = false;
                showLift(next);
                const generation = dragGen.current;
                requestAnimationFrame(() => {
                  if (dragGen.current === generation) setHeld(true);
                });
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(book.id));
                const rect = event.currentTarget.getBoundingClientRect();
                event.dataTransfer.setDragImage(event.currentTarget, event.clientX - rect.left, event.clientY - rect.top);
              }}
              onDragEnd={() => {
                const generation = dragGen.current;
                setHeld(false);
                if (dropped.current) {
                  dropped.current = false;
                  showLift(null);
                  return;
                }
                const current = liftRef.current;
                if (!current) return;
                showLift({ ...current, to: current.from });
                window.setTimeout(() => {
                  if (dragGen.current === generation) showLift(null);
                }, 380);
              }}
            >
              <div className="book-name">
                <h2>{book.title}</h2>
                <p>{book.badge || "No badge"} · {book.shelf === "card" ? "Still growing" : "On the shelf"}</p>
              </div>
              <div className="card-shots">
                {book.cover ? (
                  <img src={book.cover} alt="" draggable={false} style={book.coverStyle === "night" ? { background: "#102033" } : undefined} />
                ) : (
                  <span className="book-thumb">{book.shortTitle || book.title}</span>
                )}
              </div>
              <div className="row">
                <Link className="button quiet" to={`/books/${book.id}`}>Edit</Link>
                <button className="quiet" type="button" onClick={() => void onRemove(book)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
