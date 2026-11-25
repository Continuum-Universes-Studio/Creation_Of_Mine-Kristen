import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  deleteGalleryGroup,
  loadGallery,
  saveGalleryOrder,
  savePage,
  type GalleryGroup,
  type GalleryIntro,
} from "../api";
import { useConfirm } from "../components/Confirm";
import PictureField from "../components/PictureField";
import { applyInsert, insertionIndex, shiftsFor, type Lift } from "../reorder";

const heroPlaces = [
  "top left, beside the title",
  "top right, beside the title",
  "bottom left, beside the title",
  "bottom right, beside the title",
];

export default function GalleryDeskPage() {
  const [page, setPage] = useState<GalleryIntro | null>(null);
  const [groups, setGroups] = useState<GalleryGroup[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
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
    loadGallery()
      .then((next) => {
        if (!alive) return;
        setPage(next.page);
        setGroups(next.groups);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "The gallery did not load.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onIntro(event: FormEvent) {
    event.preventDefault();
    if (!page) return;
    setError("");
    setNotice("");
    try {
      setPage(await savePage("gallery", page));
      setNotice("The opening is saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The opening was not saved.");
    }
  }

  async function onRemove(group: GalleryGroup) {
    const yes = await confirm(`Remove “${group.title}”?`);
    if (!yes) return;
    setError("");
    try {
      await deleteGalleryGroup(group.id);
      setGroups((current) => current?.filter((item) => item.id !== group.id) ?? current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The group was not removed.");
    }
  }

  async function keep(next: GalleryGroup[]) {
    const ticket = ++saveTicket.current;
    setGroups(next);
    try {
      await saveGalleryOrder(next.map((group) => group.id));
    } catch (caught) {
      if (ticket !== saveTicket.current) return;
      setError(caught instanceof Error ? caught.message : "The order was not saved.");
      const fresh = await loadGallery().catch(() => null);
      if (ticket === saveTicket.current && fresh) setGroups(fresh.groups);
    }
  }

  if (!page || !groups) return <p className="notice">{error || "Opening the gallery…"}</p>;

  const shifts = lift ? shiftsFor(lift.from, lift.to, lift.tops, lift.heights) : null;

  return (
    <section className="stack-sections">
      <form className="sheet" onSubmit={onIntro}>
        <details className="dropdown">
        <summary><h2>The opening</h2></summary>
        <p className="notice">This is the top of the art gallery: the title, the four pictures beside it, and the sentence underneath.</p>
        <div className="fields">
          <label className="wide">
            <span>Heading<span className="where"> (the big title)</span></span>
            <input value={page.title} onChange={(event) => setPage({ ...page, title: event.target.value })} />
          </label>
          <label className="wide">
            <span>Welcome<span className="where"> (the sentence under the title)</span></span>
            <textarea value={page.lede} onChange={(event) => setPage({ ...page, lede: event.target.value })} />
          </label>
          <label className="wide">
            <span>Note<span className="where"> (the sentence under the four pictures)</span></span>
            <textarea value={page.intro} onChange={(event) => setPage({ ...page, intro: event.target.value })} />
          </label>
        </div>
        <h3>Pictures beside the title</h3>
        {page.stack.map((picture, index) => (
          <details className="dropdown piece" key={`stack-${index}`}>
            <summary>
              <span>Picture {index + 1}<span className="where"> ({heroPlaces[index] ?? "in the pictures beside the title"})</span></span>
              {picture.src ? (
                <img src={picture.src} alt="" draggable={false} style={picture.tone === "night" ? { background: "#102033" } : undefined} />
              ) : null}
            </summary>
            <PictureField
              label="Picture"
              value={picture.src}
              onChange={(src) => setPage({ ...page, stack: page.stack.map((item, itemIndex) => itemIndex === index ? { ...item, src } : item) })}
              removeLabel="Remove picture"
              onRemove={() => {
                void confirm("Remove this picture?").then((yes) => {
                  if (yes) setPage({ ...page, stack: page.stack.filter((_, itemIndex) => itemIndex !== index) });
                });
              }}
            />
            <label>
              <span>Description<span className="where"> (read aloud, not printed)</span></span>
              <input value={picture.alt} onChange={(event) => setPage({ ...page, stack: page.stack.map((item, itemIndex) => itemIndex === index ? { ...item, alt: event.target.value } : item) })} />
            </label>
            <label>
              <span>Background<span className="where"> (the color behind the picture)</span></span>
              <select value={picture.tone} onChange={(event) => setPage({ ...page, stack: page.stack.map((item, itemIndex) => itemIndex === index ? { ...item, tone: event.target.value } : item) })}>
                <option value="">Plain</option>
                <option value="night">Dark</option>
              </select>
            </label>
          </details>
        ))}
        <button className="quiet" type="button" onClick={() => setPage({ ...page, stack: [...page.stack, { src: "", alt: "", tone: "" }] })}>Add a picture</button>
        <div className="row">
          <button type="submit">Save the opening</button>
        </div>
        {notice ? <p className="notice">{notice}</p> : null}
        </details>
      </form>

      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Picture sets</h2>
        <Link className="button" to="/gallery/new">New set</Link>
      </div>
      <p className="notice">Each set is one carousel on the gallery. The top set is the first one visitors see. Press a set and drag it up or down.</p>
      {error ? <p className="error">{error}</p> : null}
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
          if (!current || !groups) return;
          const next = applyInsert(groups, current.from, current.to);
          if (next !== groups) void keep(next);
        }}
      >
        {groups.map((group, index) => {
          const shift = shifts?.[index] ?? 0;
          const pictures = group.pieces.filter((piece) => piece.src);
          return (
            <article
              className={`card${held && lift?.id === group.id ? " lifting" : ""}`}
              key={group.id}
              draggable
              style={lift ? { transform: `translateY(${shift}px)` } : undefined}
              onDragStart={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button")) {
                  event.preventDefault();
                  return;
                }
                const list = listRef.current;
                if (!list) return;
                const cards = [...list.querySelectorAll<HTMLElement>("article.card")];
                const from = groups.findIndex((item) => item.id === group.id);
                const next: Lift = {
                  id: group.id,
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
                event.dataTransfer.setData("text/plain", String(group.id));
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
                <h2>{group.title}</h2>
                <p>
                  {pictures.length === 1 ? "1 picture" : `${pictures.length} pictures`}
                  {group.note ? ` · ${group.note}` : ""}
                </p>
              </div>
              <div className="card-shots">
                {pictures.slice(0, 6).map((piece, shot) => (
                  <img
                    src={piece.src}
                    alt=""
                    draggable={false}
                    key={`${piece.src}-${shot}`}
                    style={piece.tone === "night" || piece.tone === "framed" ? { background: "#102033" } : undefined}
                  />
                ))}
              </div>
              <div className="row">
                <Link className="button quiet" to={`/gallery/${group.id}`}>Edit</Link>
                <button className="quiet" type="button" onClick={() => void onRemove(group)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
