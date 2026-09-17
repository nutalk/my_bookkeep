export type Theme = "light" | "lightgray" | "gray" | "dark" | "custom";

const THEME_KEY = "theme";
const CUSTOM_COLORS_KEY = "theme-custom-colors";

const ALL_THEMES: Theme[] = ["light", "lightgray", "gray", "dark", "custom"];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** 自定义主题可调的主要颜色；key 为 Tailwind v4 覆盖用的 CSS 变量名 */
export interface ThemeColorDef {
  key: string;
  label: string;
  group: string;
  /** 未自定义时的取值，等同默认（dark）主题 */
  fallback: string;
}

export const CUSTOM_THEME_COLORS: ThemeColorDef[] = [
  {
    key: "--color-neutral-950",
    label: "页面背景",
    group: "基础",
    fallback: "#0a0a0a",
  },
  {
    key: "--color-neutral-900",
    label: "卡片背景",
    group: "基础",
    fallback: "#171717",
  },
  {
    key: "--color-neutral-800",
    label: "边框 / 分隔线",
    group: "基础",
    fallback: "#262626",
  },
  {
    key: "--color-neutral-700",
    label: "输入框边框",
    group: "基础",
    fallback: "#404040",
  },
  {
    key: "--color-neutral-600",
    label: "弱化文字",
    group: "文字",
    fallback: "#525252",
  },
  {
    key: "--color-neutral-500",
    label: "辅助文字",
    group: "文字",
    fallback: "#737373",
  },
  {
    key: "--color-neutral-400",
    label: "次要文字",
    group: "文字",
    fallback: "#a3a3a3",
  },
  {
    key: "--color-neutral-300",
    label: "正文文字",
    group: "文字",
    fallback: "#d4d4d4",
  },
  {
    key: "--color-neutral-200",
    label: "强调文字",
    group: "文字",
    fallback: "#e5e5e5",
  },
  {
    key: "--color-white",
    label: "标题文字",
    group: "文字",
    fallback: "#ffffff",
  },
];

/** 自定义配色的默认值（等同默认 dark 主题） */
export function getDefaultCustomColors(): Record<string, string> {
  const colors: Record<string, string> = {};
  for (const def of CUSTOM_THEME_COLORS) colors[def.key] = def.fallback;
  return colors;
}

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t && (ALL_THEMES as string[]).includes(t)) return t as Theme;
  } catch {}
  return "dark";
}

/** 读取自定义配色，缺失或非法项回落到默认值 */
export function getCustomColors(): Record<string, string> {
  const colors = getDefaultCustomColors();
  if (typeof window === "undefined") return colors;
  try {
    const raw = localStorage.getItem(CUSTOM_COLORS_KEY);
    if (!raw) return colors;
    const saved = JSON.parse(raw) as Record<string, unknown>;
    for (const def of CUSTOM_THEME_COLORS) {
      const v = saved?.[def.key];
      if (typeof v === "string" && HEX_RE.test(v)) colors[def.key] = v;
    }
  } catch {}
  return colors;
}

/** 通过行内 CSS 变量覆盖主题色（优先级高于 globals.css 里的 data-theme 规则） */
function applyCustomColors(colors: Record<string, string>): void {
  const root = document.documentElement;
  for (const def of CUSTOM_THEME_COLORS) {
    const v = colors[def.key];
    if (v) root.style.setProperty(def.key, v);
  }
}

function clearCustomColors(): void {
  const root = document.documentElement;
  for (const def of CUSTOM_THEME_COLORS) root.style.removeProperty(def.key);
}

/** 保存并立即应用自定义配色 */
export function saveCustomColors(colors: Record<string, string>): void {
  try {
    localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colors));
  } catch {}
  applyCustomColors(colors);
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  // 自定义配色走行内变量，切回内置主题时必须清掉，否则会残留覆盖
  if (theme === "custom") applyCustomColors(getCustomColors());
  else clearCustomColors();
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}
