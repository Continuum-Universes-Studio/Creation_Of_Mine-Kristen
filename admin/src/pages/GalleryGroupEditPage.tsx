import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteGalleryGroup,
  loadGallery,
  saveGalleryGroup,
  uploadPicture,
  type GalleryPiece,
} from "../api";
import { useConfirm } from "../components/Confirm";
import { applyInsert, insertionIndex, shiftsFor, type Lift } from "../reorder";

type DraftPiece = GalleryPiece & { key: string };

function draftFrom(piece: GalleryPiece, index: number): DraftPiece {
  return { ...piece, key: piece.id ? `saved-${piece.id}` : `loaded-${index}` };
}

export default function GalleryGroupEditPage() {
  const { id } = useParams();
  const groupId = id ? Number(id) : 0;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [sort, setSort] = useState(0);
  const [pieces, setPieces] = useState<DraftPiece[]>([]);
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lift, setLift] = useState<Lift | null>(null);
  const [held, setHeld] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const liftRef = useRef<Lift | null>(null);
  const dragGen = useRef(0);
  const dropped = useRef(false);
  const keyCount = useRef(1);
  const piecesRef = useRef(pieces);
  piecesRef.current = pieces;

  function showLift(next: Lift | null) {
    liftRef.current = next;
    setLift(next);
  }

  function addKey() {
    keyCount.current += 1;
    return `new-${keyCount.current}`;
  }

  useEffect(() => {
    if (id && !Number.isInteger(groupId)) {
      setMissing(true);
      setReady(true);
      return;
    }
    let alive = true;
    loadGallery()
      .then((next) => {
        if (!alive) return;
        if (!groupId) {
          setSort(next.groups.length);
          setReady(true);
          return;
        }
        const group = next.groups.find((item) => item.id === groupId);
        if (!group) {
          setMissing(true);
          setReady(true);
          return;
        }
        setTitle(group.title);
        setNote(group.note);
        setSort(group.sort);
        setPieces(group.pieces.map(draftFrom));
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        setError(caught instanceof Error ? caught.message : "The set did not load.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [groupId, id]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const saved = await saveGalleryGroup({
        id: groupId || undefined,
        title,
        note,
        sort,
        pieces: pieces.filter((piece) => piece.src.trim()),
      });
      if (!groupId && "id" in saved) {
        navigate(`/gallery/${saved.id}`, { replace: true });
        return;
      }
      setNotice("Saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The set was not saved.");
    }
  }

  async function onDelete() {
    const yes = await confirm(`Remove “${title || "this set"}”?`);
    if (!yes) return;
    if (!groupId) {
      navigate("/gallery");
      return;
    }
    setError("");
    try {
      await deleteGalleryGroup(groupId);
      navigate("/gallery");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The set was not removed.");
    }
  }

  async function onFile(key: string, file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const src = await uploadPicture(file);
      setPieces((current) => current.map((piece) => piece.key === key ? { ...piece, src } : piece));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The picture did not upload.");
    }
  }

  if (!ready) return <p className="notice">{error || "Opening the pictures…"}</p>;
  if (missing) {
    return (
      <section>
        <p>That set of pictures is not here.</p>
        <p><Link to="/gallery">Back to the gallery</Link></p>
      </section>
    );
  }

  const shifts = lift ? shiftsFor(lift.from, lift.to, lift.tops, lift.heights) : null;

  return (
    <form className="sheet" onSubmit={(event) => void onSubmit(event)}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{title || "New set"}</h2>
        <Link to="/gallery">Back to the gallery</Link>
      </div>
      <p className="notice">This heading and note sit above the carousel. Show all opens every picture in this set.</p>
      <div className="fields">
        <label className="wide">
          <span>Title<span className="where"> (the heading above the carousel)</span></span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="wide">
          <span>Note<span className="where"> (the sentence under that heading)</span></span>
          <textarea value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </div>
      <h3>Pictures</h3>
      <p className="notice">These turn in the carousel, and they fill the show-all page. Press a picture and drag it, then save.</p>
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
          if (!current) return;
          setPieces((currentPieces) => applyInsert(currentPieces, current.from, current.to));
        }}
      >
        {pieces.map((piece, index) => {
          const shift = shifts?.[index] ?? 0;
          return (
            <article
              className={`piece gallery-piece${held && lift?.id === piece.key ? " lifting" : ""}`}
              key={piece.key}
              draggable
              style={lift ? { transform: `translateY(${shift}px)` } : undefined}
              onDragStart={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select, label")) {
                  event.preventDefault();
                  return;
                }
                const list = listRef.current;
                if (!list) return;
                const cards = [...list.querySelectorAll<HTMLElement>("article.gallery-piece")];
                const from = piecesRef.current.findIndex((item) => item.key === piece.key);
                const next: Lift = {
                  id: piece.key,
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
                event.dataTransfer.setData("text/plain", piece.key);
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
              {piece.src ? (
                <img
                  className="thumb"
                  src={piece.src}
                  alt=""
                  draggable={false}
                  style={piece.tone === "night" || piece.tone === "framed" ? { background: "#102033" } : undefined}
                />
              ) : (
                <span className="thumb empty" />
              )}
              <div>
                <label>
                  <span>Picture</span>
                  <input value={piece.src} onChange={(event) => setPieces((current) => current.map((item) => item.key === piece.key ? { ...item, src: event.target.value } : item))} placeholder="/assets/…" />
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void onFile(piece.key, event.target.files?.[0])} />
                </label>
                <div className="fields">
                  <label>
                    <span>Description<span className="where"> (read aloud, not printed)</span></span>
                    <input value={piece.alt} onChange={(event) => setPieces((current) => current.map((item) => item.key === piece.key ? { ...item, alt: event.target.value } : item))} />
                  </label>
                  <label>
                    <span>Caption<span className="where"> (words under the picture)</span></span>
                    <input value={piece.caption} onChange={(event) => setPieces((current) => current.map((item) => item.key === piece.key ? { ...item, caption: event.target.value } : item))} />
                  </label>
                  <label>
                    <span>Background<span className="where"> (the color behind the picture)</span></span>
                    <select value={piece.tone} onChange={(event) => setPieces((current) => current.map((item) => item.key === piece.key ? { ...item, tone: event.target.value } : item))}>
                      <option value="">Plain</option>
                      <option value="night">Dark</option>
                      <option value="framed">Dark, whole picture</option>
                    </select>
                  </label>
                </div>
                <button
                  className="quiet"
                  type="button"
                  onClick={() => {
                    void confirm("Remove this picture?").then((yes) => {
                      if (yes) setPieces((current) => current.filter((item) => item.key !== piece.key));
                    });
                  }}
                >
                  Remove picture
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <button className="quiet" type="button" onClick={() => setPieces((current) => [...current, { key: addKey(), src: "", alt: "", caption: "", tone: "" }])}>Add a picture</button>
      {error ? <p className="error">{error}</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      <div className="row">
        <button type="submit">Save</button>
        <button className="quiet" type="button" onClick={() => void onDelete()}>Remove set</button>
      </div>
    </form>
  );
}
