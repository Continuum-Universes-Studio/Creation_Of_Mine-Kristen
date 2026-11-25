import { useEffect, useState, type FormEvent } from "react";
import { updateAccount } from "../api";

type AccountPageProps = {
  username: string;
  onSaved: (username: string) => void;
};

export default function AccountPage({ username, onSaved }: AccountPageProps) {
  const [name, setName] = useState(username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setName(username);
  }, [username]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    if (newPassword !== confirmPassword) {
      setError("Type the new password the same way twice.");
      return;
    }
    try {
      const session = await updateAccount({ username: name, currentPassword, newPassword });
      onSaved(session.username);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account was not saved.");
    }
  }

  return (
    <form className="sheet" onSubmit={onSubmit}>
      <h2>Account</h2>
      <p className="notice">This name and password are only for this desk.</p>
      <div className="fields">
        <label className="wide">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="username" />
        </label>
        <label className="wide">
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
        <label>
          New password again
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
        </label>
      </div>
      <p className="notice">Leave the new password blank to keep the current one.</p>
      {error ? <p className="error">{error}</p> : null}
      {saved ? <p className="notice">Saved.</p> : null}
      <button type="submit">Save</button>
    </form>
  );
}
