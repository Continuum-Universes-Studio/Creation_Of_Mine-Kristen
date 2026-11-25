import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type Ask = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(async () => false);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<{ message: string; resolve: (yes: boolean) => void } | null>(null);

  const ask = useCallback<Ask>((message) => {
    return new Promise((resolve) => {
      setPending((current) => {
        current?.resolve(false);
        return { message, resolve };
      });
    });
  }, []);

  const answer = useCallback((yes: boolean) => {
    setPending((current) => {
      current?.resolve(yes);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending ? <ConfirmBox message={pending.message} onAnswer={answer} /> : null}
    </ConfirmContext.Provider>
  );
}

function ConfirmBox({ message, onAnswer }: { message: string; onAnswer: (yes: boolean) => void }) {
  const noRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    noRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onAnswer(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);

  return (
    <div className="confirm-shade" onMouseDown={() => onAnswer(false)}>
      <div
        className="confirm-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p id="confirm-message">{message}</p>
        <div className="row">
          <button type="button" onClick={() => onAnswer(true)}>Yes</button>
          <button className="quiet" type="button" ref={noRef} onClick={() => onAnswer(false)}>No</button>
        </div>
      </div>
    </div>
  );
}
