import { useEffect, useRef, type CSSProperties } from "react";
import type { GalleryPiece } from "../data/library";

export function gallerySlug(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "gallery";
}

export function toneStyle(tone: string): CSSProperties | undefined {
  if (tone === "framed") return { background: "#102033", objectFit: "contain" };
  if (tone === "night") return { background: "#102033" };
  return undefined;
}

export function GalleryPicture({ piece, hidden }: { piece: GalleryPiece; hidden?: boolean }) {
  return (
    <figure className="gallery-item" aria-hidden={hidden || undefined}>
      <img src={piece.src} alt={hidden ? "" : piece.alt} style={toneStyle(piece.tone)} />
      {piece.caption ? <figcaption>{piece.caption}</figcaption> : null}
    </figure>
  );
}

export default function GalleryReel({ pieces }: { pieces: GalleryPiece[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const shown = pieces.filter((piece) => piece.src);
  const extras = shown.length > 1 ? shown.slice(0, Math.min(3, shown.length)) : [];

  useEffect(() => {
    const track = trackRef.current;
    const reel = track?.parentElement;
    if (!track || !reel || shown.length < 2) return;

    let index = 0;
    let timer = 0;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function shift() {
      const card = track?.children[0];
      if (!(card instanceof HTMLElement) || !track) return 0;
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function go(next: number, animate: boolean) {
      index = next;
      if (!track) return;
      track.style.transition = animate ? "" : "none";
      track.style.transform = `translateX(${-index * shift()}px)`;
      if (!animate) track.offsetHeight;
    }

    function step() {
      go(index + 1, true);
      if (index < shown.length) return;
      const finish = () => {
        track?.removeEventListener("transitionend", onEnd);
        go(0, false);
      };
      const onEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.target !== track || event.propertyName !== "transform") return;
        finish();
      };
      track?.addEventListener("transitionend", onEnd);
      window.setTimeout(finish, 1400);
    }

    function start() {
      if (motion.matches || timer) return;
      timer = window.setInterval(step, 3000);
    }

    function stop() {
      window.clearInterval(timer);
      timer = 0;
    }

    const onEnter = () => stop();
    const onLeave = () => start();
    const onResize = () => go(0, false);
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    reel.addEventListener("mouseenter", onEnter);
    reel.addEventListener("mouseleave", onLeave);
    reel.addEventListener("focusin", onEnter);
    reel.addEventListener("focusout", onLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      reel.removeEventListener("mouseenter", onEnter);
      reel.removeEventListener("mouseleave", onLeave);
      reel.removeEventListener("focusin", onEnter);
      reel.removeEventListener("focusout", onLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      track.style.transform = "";
    };
  }, [shown.length, shown.map((piece) => piece.src).join("|")]);

  if (!shown.length) return null;

  return (
    <div className="gallery-reel">
      <div className="gallery-reel-track" ref={trackRef}>
        {shown.map((piece) => (
          <GalleryPicture piece={piece} key={piece.src} />
        ))}
        {extras.map((piece, index) => (
          <GalleryPicture piece={piece} hidden key={`${piece.src}-again-${index}`} />
        ))}
      </div>
    </div>
  );
}
