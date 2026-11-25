import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import GalleryReel, { gallerySlug, toneStyle } from "../components/GalleryReel";
import MarkupPage from "../components/MarkupPage";
import galleryHtml from "../content/gallery";
import { loadGallery, type GalleryIntro, type GalleryGroup } from "../data/library";

export default function GalleryPage() {
  const [page, setPage] = useState<GalleryIntro | null>(null);
  const [groups, setGroups] = useState<GalleryGroup[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadGallery().then((next) => {
      if (!alive) return;
      if (!next?.page || !next.groups) {
        setFailed(true);
        return;
      }
      setPage(next.page);
      setGroups(next.groups);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (failed) return <MarkupPage html={galleryHtml} />;
  if (!page || !groups) {
    return <main><section className="section"><div className="wrap"><p>Opening the gallery…</p></div></section></main>;
  }

  return (
    <main>
      <section className="page-hero wrap">
        <div>
          <p className="eyebrow" style={{ justifyContent: "flex-start" }}>{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="lede">{page.lede}</p>
          <p><a className="btn" href="#gallery">{page.button}</a></p>
        </div>
        <div className="stack">
          {page.stack.filter((picture) => picture.src).map((picture) => (
            <img src={picture.src} alt={picture.alt} key={picture.src} style={toneStyle(picture.tone)} />
          ))}
        </div>
      </section>
      <section className="section" id="gallery">
        <div className="wrap">
          <p>{page.intro}</p>
          {groups.map((group) => (
            <div className="gallery-group" key={group.id}>
              <h2>{group.title}</h2>
              {group.note ? <p>{group.note}</p> : null}
              <GalleryReel pieces={group.pieces} />
              <p><Link className="btn light" to={`/gallery/${gallerySlug(group.title)}`}>show all</Link></p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
