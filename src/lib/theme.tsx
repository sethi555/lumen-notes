import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeName = "focus" | "circadian" | "reading";

export const THEMES: { id: ThemeName; label: string; blurb: string }[] = [
  { id: "focus", label: "Focus", blurb: "Soft sage greens tuned to retinal comfort" },
  { id: "circadian", label: "Circadian", blurb: "Pure black & amber, minimal blue light" },
  { id: "reading", label: "Reading", blurb: "Warm sepia & cream textures" },
];

type ThemeCtx = { theme: ThemeName; setTheme: (t: ThemeName) => void };
const Ctx = createContext<ThemeCtx>({ theme: "focus", setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>("focus");

  useEffect(() => {
    const stored = (typeof localStorage !== "undefined" &&
      localStorage.getItem("lumen-theme")) as ThemeName | null;
    if (stored) setThemeState(stored);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "circadian");
    if (typeof localStorage !== "undefined") localStorage.setItem("lumen-theme", theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, setTheme: setThemeState }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
