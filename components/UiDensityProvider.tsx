"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type UiDensityMode = "compact" | "comfortable" | "spacious" | "custom";

type UiDensitySettings = {
  mode: UiDensityMode;
  customFontSize: number;
};

type UiDensityContextValue = UiDensitySettings & {
  effectiveFontSize: number;
  setMode: (mode: UiDensityMode) => void;
  setCustomFontSize: (fontSize: number) => void;
};

const STORAGE_KEY = "finnnance-ui-density";
const DEFAULT_SETTINGS: UiDensitySettings = {
  mode: "compact",
  customFontSize: 14.5,
};

const densityFontSize: Record<Exclude<UiDensityMode, "custom">, number> = {
  compact: 14.5,
  comfortable: 15.25,
  spacious: 16,
};

const UiDensityContext = createContext<UiDensityContextValue | null>(null);

function clampCustomFontSize(value: number) {
  return Math.min(17, Math.max(13, value));
}

function getEffectiveFontSize(settings: UiDensitySettings) {
  return settings.mode === "custom"
    ? clampCustomFontSize(settings.customFontSize)
    : densityFontSize[settings.mode];
}

function readStoredSettings(): UiDensitySettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(stored) as Partial<UiDensitySettings>;
    const mode =
      parsed.mode === "compact" ||
      parsed.mode === "comfortable" ||
      parsed.mode === "spacious" ||
      parsed.mode === "custom"
        ? parsed.mode
        : DEFAULT_SETTINGS.mode;
    const customFontSize =
      typeof parsed.customFontSize === "number"
        ? clampCustomFontSize(parsed.customFontSize)
        : DEFAULT_SETTINGS.customFontSize;

    return { mode, customFontSize };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function storeSettings(settings: UiDensitySettings) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function UiDensityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(readStoredSettings);
  const effectiveFontSize = getEffectiveFontSize(settings);
  const textScale = effectiveFontSize / 16;

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--ui-font-size",
      `${effectiveFontSize}px`,
    );
    document.documentElement.style.setProperty(
      "--ui-text-scale",
      String(textScale),
    );
    document.documentElement.dataset.uiDensity = settings.mode;
  }, [effectiveFontSize, settings.mode, textScale]);

  const contextValue = useMemo<UiDensityContextValue>(
    () => ({
      ...settings,
      effectiveFontSize,
      setMode(mode) {
        setSettings((current) => {
          const nextSettings = { ...current, mode };
          storeSettings(nextSettings);

          return nextSettings;
        });
      },
      setCustomFontSize(fontSize) {
        setSettings((current) => {
          const nextSettings = {
            ...current,
            mode: "custom" as const,
            customFontSize: clampCustomFontSize(fontSize),
          };
          storeSettings(nextSettings);

          return nextSettings;
        });
      },
    }),
    [effectiveFontSize, settings],
  );

  return (
    <UiDensityContext.Provider value={contextValue}>
      {children}
    </UiDensityContext.Provider>
  );
}

export function useUiDensity() {
  const context = useContext(UiDensityContext);

  if (!context) {
    throw new Error("useUiDensity must be used inside UiDensityProvider");
  }

  return context;
}
