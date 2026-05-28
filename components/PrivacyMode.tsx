"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "privacy_amounts_hidden";

type PrivacyModeContextValue = {
  amountsHidden: boolean;
};

const PrivacyModeContext = createContext<PrivacyModeContextValue>({
  amountsHidden: false,
});

export function PrivacyModeProvider({ children }: { children: ReactNode }) {
  const [amountsHidden, setAmountsHidden] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const contextValue = useMemo(() => ({ amountsHidden }), [amountsHidden]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setAmountsHidden(window.localStorage.getItem(STORAGE_KEY) === "true");
      setPreferenceLoaded(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle(
      "privacy-amounts-hidden",
      amountsHidden,
    );
    document.documentElement.setAttribute(
      "data-privacy-amounts-hidden",
      String(amountsHidden),
    );
    document.body.classList.toggle("privacy-amounts-hidden", amountsHidden);
    document.body.setAttribute(
      "data-privacy-amounts-hidden",
      String(amountsHidden),
    );

    if (preferenceLoaded) {
      window.localStorage.setItem(STORAGE_KEY, String(amountsHidden));
    }
  }, [amountsHidden, preferenceLoaded]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove("privacy-amounts-hidden");
      document.documentElement.removeAttribute("data-privacy-amounts-hidden");
      document.body.classList.remove("privacy-amounts-hidden");
      document.body.removeAttribute("data-privacy-amounts-hidden");
    };
  }, []);

  return (
    <PrivacyModeContext.Provider value={contextValue}>
      <div className={amountsHidden ? "privacy-amounts-hidden" : undefined}>
        {children}
        <button
          type="button"
          onClick={() => setAmountsHidden((current) => !current)}
          aria-pressed={amountsHidden}
          aria-label={
            amountsHidden
              ? "Tampilkan nominal uang"
              : "Sembunyikan nominal uang"
          }
          title={amountsHidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
          className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-lg transition hover:bg-zinc-50 active:scale-95 lg:bottom-5"
        >
          {amountsHidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </PrivacyModeContext.Provider>
  );
}

export function SensitiveAmount({
  children,
  className,
  placeholder = "Rp.*******",
}: {
  children: ReactNode;
  className?: string;
  placeholder?: string;
}) {
  const { amountsHidden } = useContext(PrivacyModeContext);

  return (
    <span data-sensitive-amount className={`privacy-amount ${className || ""}`}>
      {amountsHidden ? placeholder : children}
    </span>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 13.4 13.4" />
      <path d="M9.9 4.3A10.5 10.5 0 0 1 12 4c6.5 0 10 8 10 8a17.4 17.4 0 0 1-3.1 4.4" />
      <path d="M6.1 6.1C3.4 8 2 12 2 12s3.5 8 10 8a10.6 10.6 0 0 0 5.9-1.9" />
    </svg>
  );
}
