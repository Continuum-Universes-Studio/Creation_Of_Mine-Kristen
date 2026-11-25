import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { catalog, type SearchItem } from "../data/catalog";
import { loadBooks } from "../data/library";
import { loadStories } from "../data/stories";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState<SearchItem[]>([]);
  const [books, setBooks] = useState<SearchItem[]>([]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.all([loadStories(), loadBooks()]).then(([stories, nextBooks]) => {
      if (!alive) return;
      setNotes(
        stories.map((story) => ({
          title: story.title,
          kind: "Story note",
          href: `/blog#${story.slug}`,
          text: story.html.replace(/<[^>]+>/g, " "),
        })),
      );
      setBooks(
        (nextBooks ?? []).map((book) => ({
          title: book.title,
          kind: "Book",
          href: book.shelf === "card" ? "/books#upcoming" : `/books#${book.slug}`,
          text: `${book.badge} ${book.body}`,
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [open]);

  const results = useMemo(() => {
    const printed = books.length ? catalog.filter((item) => item.kind !== "Book") : catalog;
    const items = [...printed, ...books, ...notes];
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 6);
    return items.filter((item) => `${item.title} ${item.text} ${item.kind}`.toLowerCase().includes(q));
  }, [notes, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <dialog
      id="search-dialog"
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label htmlFor="search-input">Search books and stories</label>
        <input
          id="search-input"
          type="search"
          placeholder="Try Floopa, Fluffkins, or printables"
          value={query}
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <ul id="search-results">
        {results.length > 0 ? (
          results.map((item) => (
            <li key={`${item.kind}-${item.href}-${item.title}`}>
              <a
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  onClose();
                  navigate(item.href);
                }}
              >
                <strong>{item.title}</strong>
                <small>{item.kind}</small>
              </a>
            </li>
          ))
        ) : (
          <li><small>Nothing matches that yet. Try a book title or “printables”.</small></li>
        )}
      </ul>
    </dialog>
  );
}
