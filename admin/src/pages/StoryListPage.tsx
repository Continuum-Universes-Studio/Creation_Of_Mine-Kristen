import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { deleteStory, listStories, saveStoryOrder, type Story } from "../api";
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

function previewText(body: string) {
  const words = body.replace(/\s+/g, " ").trim();
  if (words.length <= 120) return words;
  return `${words.slice(0, 120).trimEnd()}…`;
}

function applyInsert(list: Story[], from: number, to: number) {
  if (from === to) return list;
  const next = list.slice();
  const [moving] = next.splice(from, 1);
  if (!moving) return list;
  next.splice(to, 0, moving);
  return next;
}

export default function StoryListPage() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [error, setError] = useState("");
  const [chosen, setChosen] = useState<number | null>(null);
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
    listStories()
      .then((rows) => {
        if (alive) setStories(rows);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof Error ? caught.message : "The stories did not load.");
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onRemove(story: Story) {
    const yes = await confirm(`Remove “${story.title}”?`);
    if (!yes) return;
    setError("");
    try {
      await deleteStory(story.id);
      setStories((current) => current?.filter((item) => item.id !== story.id) ?? current);
      setChosen((current) => current === story.id ? null : current);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The letter was not removed.");
    }
  }

  async function keep(next: Story[]) {
    const ticket = ++saveTicket.current;
    setStories(next);
    try {
      await saveStoryOrder(next.map((story) => story.id));
    } catch (caught) {
      if (ticket !== saveTicket.current) return;
      setError(caught instanceof Error ? caught.message : "The order was not saved.");
      const rows = await listStories().catch(() => null);
      if (ticket === saveTicket.current && rows) setStories(rows);
    }
  }

  const shifts = lift ? shiftsFor(lift.from, lift.to, lift.tops, lift.heights) : null;

  return (
    <section>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Blog</h2>
        <Link className="button" to="/blog/new">New letter</Link>
      </div>
      <p className="notice">The top letter is the first one visitors see. Press a letter and drag it up or down.</p>
      {error ? <p className="error">{error}</p> : null}
      {stories === null && !error ? <p className="notice">Loading stories…</p> : null}
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
          if (!current || !stories) return;
          const next = applyInsert(stories, current.from, current.to);
          if (next !== stories) void keep(next);
        }}
      >
        {stories?.map((story, index) => {
          const shift = shifts?.[index] ?? 0;
          return (
            <article
              className={`card${chosen === story.id ? " chosen" : ""}${held && lift?.id === story.id ? " lifting" : ""}`}
              key={story.id}
              draggable
              style={lift ? { transform: `translateY(${shift}px)` } : undefined}
              onClick={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button")) return;
                setChosen(story.id);
              }}
              onDragStart={(event) => {
                if (event.target instanceof Element && event.target.closest("a, button")) {
                  event.preventDefault();
                  return;
                }
                const list = listRef.current;
                if (!list || !stories) return;
                const cards = [...list.querySelectorAll<HTMLElement>("article.card")];
                const from = stories.findIndex((item) => item.id === story.id);
                const next: Lift = {
                  id: story.id,
                  from,
                  to: from,
                  tops: cards.map((card) => card.offsetTop),
                  heights: cards.map((card) => card.offsetHeight),
                };
                dragGen.current += 1;
                dropped.current = false;
                showLift(next);
                setChosen(story.id);
                const generation = dragGen.current;
                requestAnimationFrame(() => {
                  if (dragGen.current === generation) setHeld(true);
                });
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", String(story.id));
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
              <div className="card-main">
                <h2>{story.title}</h2>
                <p>{story.date}</p>
              </div>
              <div className="card-demo">
                {story.pictures.some((group) => group.srcs.length) ? (
                  <div className="card-shots">
                    {story.pictures.flatMap((group) => group.srcs).map((src, shot) => (
                      <img key={`${src}-${shot}`} src={src} alt="" draggable={false} />
                    ))}
                  </div>
                ) : null}
                <p>{previewText(story.body)}</p>
              </div>
              <div className="row">
                <Link className="button quiet" to={`/blog/${story.id}`}>Edit</Link>
                <button className="quiet" type="button" onClick={() => void onRemove(story)}>Remove</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
