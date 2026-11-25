import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import MarkupPage from "./components/MarkupPage";
import SiteFooter from "./components/SiteFooter";
import { footers } from "./data/catalog";
import contactHtml from "./content/contact";
import readersHtml from "./content/readers";
import AboutPage from "./pages/AboutPage";
import BlogPage from "./pages/BlogPage";
import BooksPage from "./pages/BooksPage";
import GalleryGroupPage from "./pages/GalleryGroupPage";
import GalleryPage from "./pages/GalleryPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import StoryPage from "./pages/StoryPage";

function Page({ html, note }: { html: string; note: string }) {
  return (
    <>
      <MarkupPage html={html} />
      <SiteFooter note={note} />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="books" element={<><BooksPage /><SiteFooter note={footers.books} /></>} />
        <Route path="gallery" element={<><GalleryPage /><SiteFooter note={footers.gallery} /></>} />
        <Route path="gallery/:slug" element={<><GalleryGroupPage /><SiteFooter note={footers.gallery} /></>} />
        <Route path="about" element={<><AboutPage /><SiteFooter note={footers.about} /></>} />
        <Route path="readers" element={<Page html={readersHtml} note={footers.readers} />} />
        <Route path="blog" element={<><BlogPage /><SiteFooter note={footers.blog} /></>} />
        <Route path="blog/:slug" element={<><StoryPage /><SiteFooter note={footers.blog} /></>} />
        <Route path="contact" element={<Page html={contactHtml} note={footers.contact} />} />
        <Route path="*" element={<><NotFoundPage /><SiteFooter note={footers.missing} /></>} />
      </Route>
    </Routes>
  );
}
