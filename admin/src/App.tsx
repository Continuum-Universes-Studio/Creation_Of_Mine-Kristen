import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { currentSession, signOut } from "./api";
import { ConfirmProvider } from "./components/Confirm";
import AboutDeskPage from "./pages/AboutDeskPage";
import AccountPage from "./pages/AccountPage";
import BookEditPage from "./pages/BookEditPage";
import BookListPage from "./pages/BookListPage";
import BooksIntroPage from "./pages/BooksIntroPage";
import GalleryDeskPage from "./pages/GalleryDeskPage";
import GalleryGroupEditPage from "./pages/GalleryGroupEditPage";
import LoginPage from "./pages/LoginPage";
import StoryEditPage from "./pages/StoryEditPage";
import StoryListPage from "./pages/StoryListPage";

function StoryRedirect() {
  const { id } = useParams();
  return <Navigate to={`/blog/${id ?? ""}`} replace />;
}

export default function App() {
  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    currentSession()
      .then((session) => {
        if (alive) setUsername(session.username);
      })
      .catch(() => {
        if (alive) setUsername(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (username === undefined) {
    return (
      <main className="desk">
        <p className="notice">Opening the desk…</p>
      </main>
    );
  }

  return (
    <ConfirmProvider>
    <Routes>
      <Route
        path="/login"
        element={username ? <Navigate to="/" replace /> : <LoginPage onSignedIn={setUsername} />}
      />
      <Route
        path="/*"
        element={
          username ? (
            <div className="desk">
              <header className="bar">
                <div>
                  <h1>Creations of Mine</h1>
                  <p>Signed in as {username}. This desk stays on this computer.</p>
                </div>
                <button
                  className="quiet"
                  type="button"
                  onClick={() => {
                    void signOut().finally(() => {
                      setUsername(null);
                      navigate("/login");
                    });
                  }}
                >
                  Sign out
                </button>
              </header>
              <nav className="sections">
                <NavLink to="/blog">Blog</NavLink>
                <NavLink to="/books">Books</NavLink>
                <NavLink to="/gallery">Gallery</NavLink>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/account">Account</NavLink>
              </nav>
              <Routes>
                <Route index element={<Navigate to="/blog" replace />} />
                <Route path="blog" element={<StoryListPage />} />
                <Route path="blog/new" element={<StoryEditPage />} />
                <Route path="blog/:id" element={<StoryEditPage />} />
                <Route path="stories/new" element={<Navigate to="/blog/new" replace />} />
                <Route path="stories/:id" element={<StoryRedirect />} />
                <Route path="books" element={<BookListPage />} />
                <Route path="books/intro" element={<BooksIntroPage />} />
                <Route path="books/new" element={<BookEditPage />} />
                <Route path="books/:id" element={<BookEditPage />} />
                <Route path="gallery" element={<GalleryDeskPage />} />
                <Route path="gallery/new" element={<GalleryGroupEditPage />} />
                <Route path="gallery/:id" element={<GalleryGroupEditPage />} />
                <Route path="about" element={<AboutDeskPage />} />
                <Route path="account" element={<AccountPage username={username} onSaved={setUsername} />} />
              </Routes>
            </div>
          ) : (
            <LoginPage onSignedIn={setUsername} />
          )
        }
      />
    </Routes>
    </ConfirmProvider>
  );
}
