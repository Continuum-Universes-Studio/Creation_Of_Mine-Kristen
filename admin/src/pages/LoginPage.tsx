import { useEffect, useState, type FormEvent } from "react";
import { signIn } from "../api";

type LoginPageProps = {
  onSignedIn: (username: string) => void;
};

export default function LoginPage({ onSignedIn }: LoginPageProps) {
  const [username, setUsername] = useState("greatmom");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Creations of Mine-admin";
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const session = await signIn(username, password);
      onSignedIn(session.username);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That sign-in did not match.");
    }
  }

  return (
    <main className="sign-in">
      <form className="sheet" onSubmit={onSubmit}>
        <img className="mark" src="/assets/logo.png" alt="" />
        <h1>Creations of Mine-admin</h1>
        <p className="notice">Sign in to edit the site. This desk stays on this computer.</p>
        <label>
          Name
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
