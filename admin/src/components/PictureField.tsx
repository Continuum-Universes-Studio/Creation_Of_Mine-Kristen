import { useState } from "react";
import { uploadPicture } from "../api";

type PictureFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  removeLabel?: string;
  onRemove?: () => void;
};

export default function PictureField({ label, hint, value, onChange, removeLabel, onRemove }: PictureFieldProps) {
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      onChange(await uploadPicture(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The picture did not upload.");
    }
  }

  return (
    <label>
      {label || hint ? <span>{label}{hint ? <span className="where"> ({hint})</span> : null}</span> : null}
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="/assets/…" />
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void onFile(event.target.files?.[0])} />
      {value ? <img className="preview" src={value} alt="" /> : null}
      {value && onRemove ? (
        <button className="quiet" type="button" onClick={onRemove}>{removeLabel || "Remove picture"}</button>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </label>
  );
}
