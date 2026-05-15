import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "dark" | "light";

interface Accent {
  id: string;
  label: string;
  /** oklch primary color */
  primary: string;
  /** oklch ring color (usually same as primary) */
  ring: string;
  /** foreground used on top of primary */
  primaryForeground: string;
  /** path to logo image */
  logo: string;
}

export const accents: Accent[] = [
  { id: "emerald", label: "Emerald", primary: "oklch(0.74 0.17 160)", ring: "oklch(0.74 0.17 160)", primaryForeground: "oklch(0.18 0.02 250)", logo: "/img/mad_logo_green.png" },
  { id: "blue",    label: "Blue",    primary: "oklch(0.7 0.16 245)",  ring: "oklch(0.7 0.16 245)",  primaryForeground: "oklch(0.98 0.01 0)",   logo: "/img/mad_logo_blue.png" },
  { id: "violet",  label: "Violet",  primary: "oklch(0.68 0.2 295)",  ring: "oklch(0.68 0.2 295)",  primaryForeground: "oklch(0.98 0.01 0)",   logo: "/img/mad_logo_purple.png" },
  { id: "rose",    label: "Rose",    primary: "oklch(0.7 0.2 15)",    ring: "oklch(0.7 0.2 15)",    primaryForeground: "oklch(0.98 0.01 0)",   logo: "/img/mad_logo_pink.png" },
  { id: "amber",   label: "Amber",   primary: "oklch(0.78 0.17 75)",  ring: "oklch(0.78 0.17 75)",  primaryForeground: "oklch(0.18 0.02 250)", logo: "/img/mad_logo_purple.png" },
];

interface ThemeState {
  mode: Mode;
  accentId: string;
  setMode: (m: Mode) => void;
  setAccent: (id: string) => void;
}

const Ctx = createContext<ThemeState | null>(null);

const MODE_KEY = "homelab.theme.mode";
const ACCENT_KEY = "homelab.theme.accent";

function applyAccent(id: string) {
  const a = accents.find((x) => x.id === id) || accents[0];
  const r = document.documentElement.style;
  r.setProperty("--primary", a.primary);
  r.setProperty("--primary-foreground", a.primaryForeground);
  r.setProperty("--ring", a.ring);
  r.setProperty("--success", a.primary);

  // Sync Sidebar & TopBar color directly with the selected accent
  r.setProperty("--sidebar-primary", a.primary);
  r.setProperty("--sidebar-ring", a.ring);
}

function applyMode(m: Mode) {
  const cl = document.documentElement.classList;
  if (m === "dark") cl.add("dark");
  else cl.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<Mode>("dark");
  const [accentId, setAccentState] = useState<string>("emerald");

  useEffect(() => {
    const m = (localStorage.getItem(MODE_KEY) as Mode) || "dark";
    const a = localStorage.getItem(ACCENT_KEY) || "emerald";
    setModeState(m);
    setAccentState(a);
    applyMode(m);
    applyAccent(a);
  }, []);

  return (
    <Ctx.Provider
      value={{
        mode,
        accentId,
        setMode: (m) => { setModeState(m); applyMode(m); localStorage.setItem(MODE_KEY, m); },
        setAccent: (id) => { setAccentState(id); applyAccent(id); localStorage.setItem(ACCENT_KEY, id); },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme outside provider");
  return c;
}
