import { Link } from "react-router-dom";
import { pages } from "../data/catalog";

type SiteFooterProps = {
  note: string;
};

export default function SiteFooter({ note }: SiteFooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <p className="footer-brand">Creations of Mine</p>
        <p>Your biggest dreams are just adventures waiting to happen.</p>
        <nav className="footer-links" aria-label="Footer">
          {pages.map(([slug, label]) => (
            <Link key={slug} to={`/${slug}`}>{label}</Link>
          ))}
        </nav>
        <p className="fine" dangerouslySetInnerHTML={{ __html: note }} />
      </div>
    </footer>
  );
}
