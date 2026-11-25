import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { bindPreviewForms, startCarousel } from "../lib/pageEffects";

type MarkupPageProps = {
  html: string;
};

export default function MarkupPage({ html }: MarkupPageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a");
      if (!(link instanceof HTMLAnchorElement) || !root.contains(link)) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("#")) return;
      event.preventDefault();
      navigate(href);
    };

    root.addEventListener("click", onClick);
    const stopForms = bindPreviewForms(root);
    const stopCarousel = startCarousel(root);
    return () => {
      root.removeEventListener("click", onClick);
      stopForms();
      stopCarousel();
    };
  }, [html, navigate]);

  return <div className="page-markup" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}
