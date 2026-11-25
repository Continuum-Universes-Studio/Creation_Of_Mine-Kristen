import { useEffect, useState } from "react";
import MarkupPage from "../components/MarkupPage";
import SiteFooter from "../components/SiteFooter";
import StorySpot from "../components/StorySpot";
import homeHtml from "../content/home";
import { footers } from "../data/catalog";
import { carouselMarkup, loadBooks } from "../data/library";

export default function HomePage() {
  const [html, setHtml] = useState(homeHtml);

  useEffect(() => {
    let alive = true;
    loadBooks().then((books) => {
      if (!alive || !books?.length) return;
      const next = homeHtml.replace(
        /<div class="book-track">[\s\S]*?<\/div>/,
        `<div class="book-track">${carouselMarkup(books)}</div>`,
      );
      setHtml(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <StorySpot />
      <MarkupPage html={html} />
      <SiteFooter note={footers.home} />
    </>
  );
}
