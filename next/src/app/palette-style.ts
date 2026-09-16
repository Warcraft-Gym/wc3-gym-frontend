import { themes } from "@/helpers/palette.mjs";

type Theme = { colors: Record<string, string>; variables: Record<string, string | number> };

// Vuetify wrote --v-theme-<token> as "r,g,b", and 15 files read those names directly,
// so the names and the format stay exactly as they were.
const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
};

// In light, seven fills name no ink of their own (DESIGN.md "Known gaps"); white is what
// Vuetify picks on them, and every one of the seven carries it at 4.5:1 or more.
const LIGHT_FALLBACK_INK = "#FBF7F1";

const body = (theme: Theme, inks: string[]) => {
  const lines = Object.entries(theme.colors).map(([token, hex]) => `--v-theme-${token}:${rgb(hex)}`);
  for (const token of inks) {
    if (!(token in theme.colors)) lines.push(`--v-theme-${token}:${rgb(LIGHT_FALLBACK_INK)}`);
  }
  for (const [name, value] of Object.entries(theme.variables)) {
    lines.push(`--v-${name}:${typeof value === "string" && value.startsWith("#") ? rgb(value) : value}`);
  }
  return lines.join(";");
};

/** The palette as one stylesheet: light under :root, dark under the chosen and the system mode. */
export function paletteStyle() {
  const light = themes.light as Theme;
  const dark = themes.dark as Theme;
  const inks = Object.keys(dark.colors).filter((token) => token.startsWith("on-"));
  const lightBody = body(light, inks);
  const darkBody = body(dark, []);
  return [
    `:root{${lightBody}}`,
    `:root[data-theme="dark"]{${darkBody}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]){${darkBody}}}`,
  ].join("");
}

/** Runs before first paint, so a hard load never flashes the other ground. Key: `theme`. */
export const THEME_SCRIPT = `try{var m=localStorage.getItem('theme')||'system';if(m!=='system')document.documentElement.dataset.theme=m;}catch(e){}`;
