import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GalleryPicture, gallerySlug } from "../components/GalleryReel";
import { loadGallery, type GalleryGroup } from "../data/library";

export default function GalleryGroupPage() {
  const { slug } = useParams();
  const [group, setGroup] = useState<GalleryGroup | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    loadGallery().then((next) => {
      if (!alive) return;
      const found = next?.groups.find((item) => gallerySlug(item.title) === slug) ?? null;
      setGroup(found);
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  if (group === undefined) {
    return <main><section className="section"><div className="wrap"><p>Opening the pictures…</p></div></section></main>;
  }

  if (!group) {
    return (
      <main>
        <section className="section">
          <div className="wrap">
            <p>That set of pictures is not here.</p>
            <p><Link to="/gallery">Back to the gallery</Link></p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="section">
        <div className="wrap">
          <p><Link to="/gallery">Back to the gallery</Link></p>
          <h1>{group.title}</h1>
          {group.note ? <p className="lede">{group.note}</p> : null}
          <div className="gallery-grid">
            {group.pieces.filter((piece) => piece.src).map((piece) => (
              <GalleryPicture piece={piece} key={piece.src} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
