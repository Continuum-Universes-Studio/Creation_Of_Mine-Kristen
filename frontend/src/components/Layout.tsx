import { useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { pages } from "../data/catalog";
import SearchDialog from "./SearchDialog";

const leaf = (
  <svg className="search-leaf" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <ellipse cx="13.2" cy="10.2" rx="6.6" ry="4.7" transform="rotate(-48 13.2 10.2)" fill="#8ea67a" stroke="#6f7d55" strokeWidth="1.15" />
    <path d="M8.4 17.4c2.1-2.5 4-4.8 7.2-7" fill="none" stroke="#f4f7ee" strokeWidth="1.15" strokeLinecap="round" />
    <path d="M7.5 16.8c.7 1.6 1.6 2.5 2.9 2.9" fill="none" stroke="#6f7d55" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const flowerSize = 13;

type Point = { x: number; y: number };

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function hop(from: Point, to: Point, u: number, arc: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  let px = -dy / len;
  let py = dx / len;
  if (py > 0 || (Math.abs(py) < 0.001 && px < 0)) {
    px = -px;
    py = -py;
  }
  const cx = (from.x + to.x) / 2 + px * arc * 2;
  const cy = (from.y + to.y) / 2 + py * arc * 2;
  const c1x = from.x + (cx - from.x) * u;
  const c1y = from.y + (cy - from.y) * u;
  const x = (1 - u) * (1 - u) * from.x + 2 * (1 - u) * u * cx + u * u * to.x;
  const y = (1 - u) * (1 - u) * from.y + 2 * (1 - u) * u * cy + u * u * to.y;
  return { x, y, c1x, c1y };
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const flowerRef = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const liveRef = useRef<Point | null>(null);
  const frameRef = useRef(0);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const flower = flowerRef.current;
    const path = pathRef.current;
    if (!nav || !flower || !path) return;

    const currentLink = () => nav.querySelector<HTMLElement>('a[aria-current="page"]');
    const shown = () => nav.getClientRects().length > 0;

    const spotFor = (link: HTMLElement): Point => {
      const navBox = nav.getBoundingClientRect();
      const box = link.getBoundingClientRect();
      return {
        x: box.right - navBox.left - flowerSize,
        y: box.top - navBox.top - 8,
      };
    };

    const park = (spot: Point) => {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      liveRef.current = spot;
      flower.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
      flower.style.opacity = "1";
      path.style.opacity = "0";
    };

    const fly = (from: Point, to: Point) => {
      liveRef.current = from;
      const len = Math.hypot(to.x - from.x, to.y - from.y);
      const navTop = nav.getBoundingClientRect().top;
      const rise = Math.max(8, Math.min(from.y, to.y) + navTop - 4);
      const sideways = Math.abs(to.y - from.y) > Math.abs(to.x - from.x);
      const arc = sideways ? Math.min(22, 10 + len * 0.05) : Math.min(rise, 10 + len * 0.05);
      const travel = Math.min(760, Math.max(460, 380 + len * 0.85));
      const fade = 320;
      const start = performance.now();
      const step = (now: number) => {
        const elapsed = now - start;
        const u = ease(Math.min(1, elapsed / travel));
        const spot = hop(from, to, u, arc);
        liveRef.current = { x: spot.x, y: spot.y };
        flower.style.transform = `translate(${spot.x}px, ${spot.y}px)`;
        flower.style.opacity = "1";
        const half = flowerSize / 2;
        path.setAttribute(
          "d",
          `M ${from.x + half} ${from.y + half} Q ${spot.c1x + half} ${spot.c1y + half} ${spot.x + half} ${spot.y + half}`,
        );
        path.style.opacity = elapsed <= travel ? "0.85" : String(Math.max(0, 0.85 * (1 - (elapsed - travel) / fade)));
        if (elapsed < travel + fade) {
          frameRef.current = requestAnimationFrame(step);
          return;
        }
        frameRef.current = 0;
        liveRef.current = to;
        path.style.opacity = "0";
      };
      frameRef.current = requestAnimationFrame(step);
    };

    const place = () => {
      if (!shown()) return;
      const link = currentLink();
      if (!link) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
        flower.style.opacity = "0";
        path.style.opacity = "0";
        return;
      }
      const next = spotFor(link);
      const from = liveRef.current;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const distance = from ? Math.hypot(next.x - from.x, next.y - from.y) : 0;
      if (!from || distance < 1 || reduce) {
        park(next);
        return;
      }
      cancelAnimationFrame(frameRef.current);
      fly(from, next);
    };

    place();
    const observer = new ResizeObserver(() => {
      if (frameRef.current || !shown()) return;
      const link = currentLink();
      if (!link) return;
      park(spotFor(link));
    });
    observer.observe(nav);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameRef.current);
    };
  }, [location.pathname, menuOpen]);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" onClick={() => setMenuOpen(false)}>
            <img src="/assets/logo.png" alt="" />
            <span>Creations of Mine</span>
          </Link>
          <button
            className="icon-btn nav-toggle"
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <nav className={menuOpen ? "nav open" : "nav"} aria-label="Primary" ref={navRef}>
            <svg className="nav-arc" aria-hidden="true">
              <path ref={pathRef} />
            </svg>
            <span className="nav-flower" ref={flowerRef} aria-hidden="true">
              <svg viewBox="0 0 16 16" width="13" height="13">
                <g transform="translate(8 8)" fill="#e7b7ae">
                  <ellipse cx="0" cy="-4.4" rx="2.2" ry="3.6" />
                  <ellipse cx="0" cy="-4.4" rx="2.2" ry="3.6" transform="rotate(72)" />
                  <ellipse cx="0" cy="-4.4" rx="2.2" ry="3.6" transform="rotate(144)" />
                  <ellipse cx="0" cy="-4.4" rx="2.2" ry="3.6" transform="rotate(216)" />
                  <ellipse cx="0" cy="-4.4" rx="2.2" ry="3.6" transform="rotate(288)" />
                  <circle r="1.35" fill="#f0d48a" />
                </g>
              </svg>
            </span>
            {pages.map(([slug, label]) => {
              const active = slug === "blog"
                ? location.pathname === "/blog" || location.pathname.startsWith("/blog/")
                : location.pathname === `/${slug}`;
              return (
                <NavLink
                  key={slug}
                  to={`/${slug}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </NavLink>
              );
            })}
            <button className="icon-btn" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}>
              {leaf}
            </button>
          </nav>
        </div>
      </header>
      <Outlet />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
