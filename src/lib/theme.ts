export type Theme = "light" | "lightgray" | "gray" | "dark";

const THEME_KEY = "theme";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "lightgray" || t === "dark" || t === "gray") {
      return t;
    }
  } catch {}
  return "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}
