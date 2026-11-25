import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteStory, listStories, saveStory } from "../api";
import { useConfirm } from "../components/Confirm";
import PictureField from "../components/PictureField";

export default function StoryEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const storyId = id ? Number(id) : undefined;
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");
  const [pictures, setPictures] = useState<{ after: string; src: string }[]>([]);
  const [error, setError] = useState("");
  const confirm = useConfirm();
  const [ready, setReady] = useState(!storyId);

  useEffect(() => {
    if (!storyId) return;
    let alive = true;
    listStories()
      .then((rows) => {
        const story = rows.find((item) => item.id === storyId);
        if (!alive) return;
        if (!story) {
          setError("That story is not here.");
          setReady(true);
          return;
        }
        setTitle(story.title);
        setDate(story.date);
        setBody(story.body);
        setPictures(story.pictures.flatMap((group) => group.srcs.map((src) => ({ after: String(group.after), src }))));
        setReady(true);
      })
      .catch((caught: unknown) => {
        if (!alive) return;
        setError(caught instanceof Error ? caught.message : "The story did not load.");
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [storyId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await saveStory({
        id: storyId,
        title,
        body,
        date,
        pictures: pictures
          .map((picture) => ({ after: Number(picture.after), src: picture.src.trim() }))
          .filter((picture) => picture.src && Number.isInteger(picture.after) && picture.after >= 0),
      });
      navigate("/blog");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The story was not saved.");
    }
  }

  async function onDelete() {
    if (!storyId) return;
    const yes = await confirm(`Remove “${title || "this letter"}”?`);
    if (!yes) return;
    setError("");
    try {
      await deleteStory(storyId);
      navigate("/blog");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The story was not removed.");
    }
  }

  if (!ready) return <p className="notice">Opening the story…</p>;

  return (
    <form className="sheet" onSubmit={onSubmit}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{storyId ? "Edit letter" : "New letter"}</h2>
        <Link to="/blog">Back to the blog</Link>
      </div>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      </label>
      <label>
        Letter
        <textarea value={body} onChange={(event) => setBody(event.target.value)} required />
      </label>
      <div className="wide">
        <p className="notice">Pictures sit after a paragraph. Use 0 to put them before the letter. The same number places pictures side by side.</p>
        {pictures.map((picture, index) => (
          <div className="piece" key={`${picture.src}-${index}`}>
            <label>
              After paragraph
              <input value={picture.after} onChange={(event) => setPictures(pictures.map((item, itemIndex) => itemIndex === index ? { ...item, after: event.target.value } : item))} />
            </label>
            <PictureField label="Picture" value={picture.src} onChange={(src) => setPictures(pictures.map((item, itemIndex) => itemIndex === index ? { ...item, src } : item))} />
            <button className="quiet" type="button" onClick={() => void confirm("Remove this picture?").then((yes) => { if (yes) setPictures(pictures.filter((_, itemIndex) => itemIndex !== index)); })}>Remove picture</button>
          </div>
        ))}
        <button className="quiet" type="button" onClick={() => setPictures([...pictures, { after: "0", src: "" }])}>Add a picture</button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button type="submit">Save</button>
        {storyId ? (
          <button className="quiet" type="button" onClick={() => void onDelete()}>
            Remove
          </button>
        ) : null}
      </div>
    </form>
  );
}
